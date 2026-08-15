import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiometricService } from '../biometric/biometric.service';
import { OfficeService } from '../office/office.service';
import { StorageService } from '../storage/storage.service';
import { CheckInDto } from './dto/check-in.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/dto/paginated-result';
import { Attendance, AttendanceType } from './entities/attendance.entity';

type UploadedImage = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  /** Liveness bisa dimatikan via env (mis. saat resource AI terbatas). */
  private readonly livenessEnabled: boolean;

  constructor(
    @InjectRepository(Attendance)
    private readonly repo: Repository<Attendance>,
    private readonly biometric: BiometricService,
    private readonly office: OfficeService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.livenessEnabled =
      config.get<string>('LIVENESS_ENABLED', 'true') !== 'false';
  }

  /**
   * Catat absensi (di-scope ke tenant). Alur:
   *  1. Geofence — office terdekat MILIK TENANT (PostGIS) & dalam radius.
   *  2. Face match — cocokkan foto dengan enrollment wajah user (tenant).
   *  3. Simpan foto bukti (MinIO) + log absensi (Postgres).
   * Gagal di salah satu langkah = absensi ditolak (tidak tercatat).
   */
  async record(
    organizationId: string,
    userId: string,
    type: AttendanceType,
    dto: CheckInDto,
    file: UploadedImage,
  ) {
    // --- 0. Anti fake-GPS (cek paling murah) ---
    if (dto.is_mock_location) {
      throw new ForbiddenException(
        'Terdeteksi lokasi palsu (mock location). Matikan aplikasi fake GPS.',
      );
    }

    // --- 1. Geofence (scoped ke tenant) ---
    const nearest = await this.office.findNearest(
      organizationId,
      dto.latitude,
      dto.longitude,
    );
    if (!nearest) {
      throw new BadRequestException('Belum ada kantor terdaftar di tenant ini');
    }
    if (nearest.distance > nearest.office.radius_meters) {
      throw new ForbiddenException(
        `Di luar radius kantor "${nearest.office.name}": ` +
          `${Math.round(nearest.distance)}m (maks ${nearest.office.radius_meters}m)`,
      );
    }

    // --- 2. Liveness / anti-spoofing (tolak foto/video) ---
    let livenessScore: number | null = null;
    if (this.livenessEnabled) {
      const liveness = await this.biometric.checkLiveness(file);
      livenessScore = liveness.score;
      if (!liveness.isReal) {
        throw new ForbiddenException(
          `Wajah terdeteksi tidak asli (anti-spoofing). Gunakan wajah langsung, bukan foto/video.`,
        );
      }
    }

    // --- 3. Face match (scoped ke tenant) ---
    const match = await this.biometric.match(organizationId, userId, file);
    if (match.distance === null) {
      throw new BadRequestException(
        'Wajah belum di-enroll. Lakukan enrollment dulu.',
      );
    }
    if (!match.matched) {
      throw new ForbiddenException(
        `Wajah tidak cocok (distance ${match.distance.toFixed(3)} > threshold ${match.threshold})`,
      );
    }

    // --- 4. Simpan bukti + log ---
    const ext = (file.mimetype ?? 'image/jpeg').split('/')[1] ?? 'jpg';
    const photoKey = `attendance/${organizationId}/${userId}/${randomUUID()}.${ext}`;
    await this.storage.putObject(photoKey, file.buffer, file.mimetype);

    const record = await this.repo.save(
      this.repo.create({
        organization_id: organizationId,
        user_id: userId,
        office_id: nearest.office.id,
        type,
        photo_key: photoKey,
        latitude: dto.latitude,
        longitude: dto.longitude,
        distance_meters: nearest.distance,
        face_distance: match.distance,
        liveness_score: livenessScore,
      }),
    );

    this.logger.log(
      `${type} org=${organizationId} user=${userId} office=${nearest.office.id} ` +
        `dist=${Math.round(nearest.distance)}m face=${match.distance.toFixed(3)}`,
    );

    return {
      id: record.id,
      type: record.type,
      office: { id: nearest.office.id, name: nearest.office.name },
      distance_meters: Math.round(nearest.distance),
      face_distance: match.distance,
      created_at: record.created_at,
    };
  }

  /** Riwayat absensi milik user (dalam tenant), ber-pagination. */
  async findMine(
    organizationId: string,
    userId: string,
    pagination?: PaginationQueryDto,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const [data, total] = await this.repo.findAndCount({
      where: { organization_id: organizationId, user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }

  /** Semua absensi dalam tenant (Admin/HRD), ber-pagination. */
  async findAll(organizationId: string, pagination?: PaginationQueryDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const [data, total] = await this.repo.findAndCount({
      where: { organization_id: organizationId },
      relations: { user: true, office: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }
}

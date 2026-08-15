import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { FaceEnrollment } from './entities/face-enrollment.entity';

/** Hasil pencocokan wajah — dikonsumsi oleh modul Attendance. */
export interface FaceMatchResult {
  matched: boolean;
  /** cosine distance ke sampel terdekat (0 = identik). null jika belum enroll. */
  distance: number | null;
  threshold: number;
  enrollmentId: string | null;
}

type UploadedImage = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
};

@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);
  /** Ambang cosine distance; di bawah nilai ini dianggap orang yang sama. */
  private readonly threshold: number;

  constructor(
    @InjectRepository(FaceEnrollment)
    private readonly repo: Repository<FaceEnrollment>,
    private readonly ai: AiService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.threshold = Number(config.get<string>('FACE_MATCH_THRESHOLD', '0.40'));
  }

  /**
   * Daftarkan wajah user: ekstrak embedding via ai-service, simpan foto bukti
   * ke MinIO, lalu persist embedding ke Postgres (pgvector). Di-scope ke tenant.
   */
  async enroll(
    organizationId: string,
    userId: string,
    file: UploadedImage,
  ): Promise<Omit<FaceEnrollment, 'embedding' | 'user'>> {
    const embedding = await this.ai.embed(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const ext = (file.mimetype ?? 'image/jpeg').split('/')[1] ?? 'jpg';
    const key = `enrollments/${organizationId}/${userId}/${randomUUID()}.${ext}`;
    await this.storage.putObject(key, file.buffer, file.mimetype);

    const entity = this.repo.create({
      organization_id: organizationId,
      user_id: userId,
      embedding,
      image_key: key,
      model: 'Facenet',
    });
    const saved = await this.repo.save(entity);
    this.logger.log(`Enrollment tersimpan user=${userId} org=${organizationId} (${saved.id})`);

    const { embedding: _e, user: _u, ...safe } = saved as FaceEnrollment;
    return safe;
  }

  /**
   * Cek liveness / anti-spoofing sebuah foto (delegasi ke ai-service).
   * Dipakai Attendance untuk menolak selfie palsu (foto/video).
   */
  checkLiveness(file: UploadedImage): Promise<{ isReal: boolean; score: number }> {
    return this.ai.checkLiveness(file.buffer, file.originalname, file.mimetype);
  }

  /**
   * Cocokkan foto wajah dengan sampel enrollment user (dalam tenant-nya).
   * Pencocokan via pgvector (cosine `<=>`) → satu round-trip DB.
   * Dipanggil modul Attendance sebelum mencatat absensi.
   */
  async match(
    organizationId: string,
    userId: string,
    file: UploadedImage,
  ): Promise<FaceMatchResult> {
    const embedding = await this.ai.embed(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return this.matchEmbedding(organizationId, userId, embedding);
  }

  /** Varian match jika pemanggil sudah punya embedding (hemat 1 call AI). */
  async matchEmbedding(
    organizationId: string,
    userId: string,
    embedding: number[],
  ): Promise<FaceMatchResult> {
    const vectorLiteral = `[${embedding.join(',')}]`;

    const rows = await this.repo.query(
      `SELECT id, embedding <=> $1::vector AS distance
         FROM face_enrollments
        WHERE user_id = $2 AND organization_id = $3 AND is_active = true
        ORDER BY distance ASC
        LIMIT 1`,
      [vectorLiteral, userId, organizationId],
    );

    if (!rows.length) {
      return {
        matched: false,
        distance: null,
        threshold: this.threshold,
        enrollmentId: null,
      };
    }

    const distance = Number(rows[0].distance);
    return {
      matched: distance <= this.threshold,
      distance,
      threshold: this.threshold,
      enrollmentId: rows[0].id,
    };
  }

  /** Daftar enrollment aktif milik user + presigned URL foto bukti. */
  async listByUser(organizationId: string, userId: string) {
    const rows = await this.repo.find({
      where: { organization_id: organizationId, user_id: userId, is_active: true },
      order: { created_at: 'DESC' },
    });
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        image_url: await this.storage.presignedGetUrl(r.image_key),
        model: r.model,
        created_at: r.created_at,
      })),
    );
  }

  async hasEnrollment(organizationId: string, userId: string): Promise<boolean> {
    return (await this.repo.count({
      where: { organization_id: organizationId, user_id: userId, is_active: true },
    })) > 0;
  }

  /** Soft-delete (nonaktifkan) satu enrollment milik user dalam tenant. */
  async deactivate(id: string, organizationId: string, userId: string): Promise<void> {
    const found = await this.repo.findOne({
      where: { id, organization_id: organizationId, user_id: userId },
    });
    if (!found) throw new NotFoundException('Enrollment tidak ditemukan');
    found.is_active = false;
    await this.repo.save(found);
  }
}

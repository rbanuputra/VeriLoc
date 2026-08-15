import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/dto/paginated-result';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

export const SUPER_ADMIN_ROLE = 'SuperAdmin';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Buat user di dalam sebuah tenant. organization_id WAJIB berasal dari
   * konteks admin yang login (bukan dari body) agar tidak bisa lintas-tenant.
   * Role SuperAdmin DILARANG dibuat lewat jalur ini (cegah privilege escalation).
   */
  async create(createUserDto: CreateUserDto, organizationId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: createUserDto.role_id },
    });
    if (!role) {
      throw new NotFoundException('Role tidak ditemukan');
    }
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new ForbiddenException(
        'Role SuperAdmin tidak bisa diberikan dari dalam tenant',
      );
    }

    try {
      const passwordHash = await bcrypt.hash(createUserDto.password, 10);
      const user = this.userRepository.create({
        fullname: createUserDto.fullname,
        email: createUserDto.email,
        password_hash: passwordHash,
        role: { id: role.id },
        organization_id: organizationId,
        is_active: createUserDto.is_active ?? true,
      });
      return await this.userRepository.save(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw error;
    }
  }

  /**
   * Buat akun SuperAdmin platform (organization_id = null). Hanya dipanggil
   * dari endpoint yang di-guard SuperAdmin — untuk provisioning tim developer.
   */
  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const role = await this.roleRepository.findOne({
      where: { name: SUPER_ADMIN_ROLE },
    });
    if (!role) {
      throw new NotFoundException(
        'Role SuperAdmin belum tersedia. Jalankan seeder dulu.',
      );
    }

    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await this.userRepository.save(
        this.userRepository.create({
          fullname: dto.fullname,
          email: dto.email,
          password_hash: passwordHash,
          role: { id: role.id },
          organization_id: null,
          is_active: true,
        }),
      );
      return { id: user.id, email: user.email, role: SUPER_ADMIN_ROLE };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw error;
    }
  }

  /**
   * Buat akun karyawan hasil onboarding dengan password SEMENTARA.
   * Mengembalikan password mentah agar HRD bisa menyerahkannya ke karyawan.
   * Karyawan wajib menggantinya (must_change_password = true).
   */
  async createEmployee(
    organizationId: string,
    data: { fullname: string; email: string; role_id: string },
  ): Promise<{ user: User; tempPassword: string }> {
    const role = await this.roleRepository.findOne({
      where: { id: data.role_id },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Role SuperAdmin tidak boleh untuk karyawan');
    }

    const tempPassword =
      'Tmp!' + randomBytes(4).toString('hex'); // mis. "Tmp!a1b2c3d4"
    try {
      const user = await this.userRepository.save(
        this.userRepository.create({
          fullname: data.fullname,
          email: data.email,
          password_hash: await bcrypt.hash(tempPassword, 10),
          role: { id: role.id },
          organization_id: organizationId,
          is_active: true,
          must_change_password: true,
        }),
      );
      return { user, tempPassword };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw error;
    }
  }

  /** Ambil user + password_hash (untuk verifikasi ganti password). */
  findByIdWithPassword(id: string) {
    return this.userRepository.findOne({
      where: { id, is_active: true },
      select: { id: true, password_hash: true, must_change_password: true },
    });
  }

  /**
   * Set password baru (dipakai reset & ganti password). Sekaligus melunasi
   * kewajiban must_change_password.
   */
  async setPassword(userId: string, newPassword: string): Promise<void> {
    const password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(
      { id: userId },
      { password_hash, must_change_password: false },
    );
  }

  /** Cari user by email (tanpa scope tenant) untuk flow forgot-password. */
  findByEmailBasic(email: string) {
    return this.userRepository.findOne({ where: { email, is_active: true } });
  }

  /** Daftar semua SuperAdmin platform (untuk audit tim developer). */
  findSuperAdmins() {
    return this.userRepository.find({
      where: { role: { name: SUPER_ADMIN_ROLE }, is_active: true },
      relations: { role: true },
    });
  }

  async findAll(organizationId: string, pagination?: PaginationQueryDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const [data, total] = await this.userRepository.findAndCount({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
      relations: { role: true },
      order: { fullname: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }

  async findOne(id: string, organizationId?: string) {
    const user = await this.userRepository.findOne({
      where: {
        id,
        is_active: true,
        ...(organizationId ? { organization_id: organizationId } : {}),
      },
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} tidak ditemukan`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, organizationId?: string) {
    const user = await this.findOne(id, organizationId)
    if (updateUserDto.fullname !== undefined) {
      user.fullname = updateUserDto.fullname;
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.password !== undefined) {
      const passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      user.password_hash = passwordHash;
    }
    if (updateUserDto.role_id !== undefined) {
      user.role = { id: updateUserDto.role_id } as any;
    }
    return this.userRepository.save(user);
  }

  async remove(id: string, organizationId?: string) {
    const user = await this.findOne(id, organizationId)
    user.is_active = false;
    return this.userRepository.save(user);
  }

  // Login: lookup global by email (email unik lintas tenant). Sertakan
  // organization_id agar bisa dimasukkan ke JWT.
  findByEmail(email:string) {
    return this.userRepository.findOne({
      where: {
        email,
        is_active: true
      },
      relations: { role:true },
      select: {
        id: true,
        email: true,
        fullname: true,
        password_hash: true,
        organization_id: true,
        role: {
          id: true,
          name: true
        }
      }
    })
  }
}

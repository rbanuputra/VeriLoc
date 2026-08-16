import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { Organization } from 'src/organization/entities/organization.entity';
import { Role } from 'src/role/entities/role.entity';
import { User } from 'src/user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { TokenService } from './token.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailService } from 'src/common/mail/mail.service';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    @InjectRepository(PasswordResetToken)
    private readonly resetRepo: Repository<PasswordResetToken>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Mulai reset password. Selalu balas sukses (tidak membocorkan apakah email
   * terdaftar). Bila email ada, kirim token reset (berlaku 1 jam).
   */
  async forgotPassword(email: string) {
    const user = await this.userService.findByEmailBasic(email);
    if (user) {
      const raw = randomBytes(32).toString('hex');
      await this.resetRepo.save(
        this.resetRepo.create({
          user_id: user.id,
          token_hash: createHash('sha256').update(raw).digest('hex'),
          expires_at: new Date(Date.now() + 3_600_000), // 1 jam
        }),
      );
      await this.mail.sendPasswordReset(email, raw);
    }
    return { message: 'Jika email terdaftar, tautan reset telah dikirim' };
  }

  /** Ganti password (user login sendiri). Mencabut semua sesi lama. */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userService.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(oldPassword, user.password_hash))) {
      throw new UnauthorizedException('Password lama salah');
    }
    await this.userService.setPassword(userId, newPassword);
    await this.tokens.revokeAllForUser(userId);
    return { message: 'Password berhasil diganti, silakan login ulang' };
  }

  /** Selesaikan reset password dengan token. */
  async resetPassword(rawToken: string, newPassword: string) {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.resetRepo.findOne({
      where: { token_hash: hash, used: false },
    });
    if (!record || record.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('Token reset tidak valid/kedaluwarsa');
    }
    await this.userService.setPassword(record.user_id, newPassword);
    record.used = true;
    await this.resetRepo.save(record);
    return { message: 'Password berhasil diubah, silakan login ulang' };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Wrong Email or Password');
    }
    return this.tokens.issue(user);
  }

  /** Tukar refresh token dengan pasangan token baru (rotasi). */
  async refresh(refreshToken: string) {
    const userId = await this.tokens.consume(refreshToken);
    const user = await this.userService.findOne(userId);
    return this.tokens.issue(user);
  }

  /** Logout: cabut refresh token. */
  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
    return { success: true };
  }

  /** Tandai tur onboarding admin selesai (sekali seumur akun). */
  async completeOnboarding(userId: string) {
    await this.userService.completeOnboarding(userId);
    return { onboarding_completed: true };
  }

  /**
   * Self-service signup tenant. Membuat Organization + user Admin pertamanya
   * secara atomik (transaksi). Mengembalikan token siap pakai.
   */
  async registerOrganization(dto: RegisterOrganizationDto) {
    const slug = dto.org_slug ?? this.slugify(dto.org_name);

    try {
      const { org, user } = await this.dataSource.transaction(async (m) => {
        if (await m.findOne(Organization, { where: { slug } })) {
          throw new ConflictException(`slug "${slug}" sudah dipakai`);
        }

        const org = await m.save(
          m.create(Organization, { name: dto.org_name, slug }),
        );

        const adminRole = await m.findOne(Role, { where: { name: 'Admin' } });
        if (!adminRole) {
          // roles global harus sudah di-seed (npm run seed).
          throw new InternalServerErrorException(
            'Role "Admin" belum tersedia. Jalankan seeder dulu.',
          );
        }

        const password_hash = await bcrypt.hash(dto.admin_password, 10);
        const user = await m.save(
          m.create(User, {
            fullname: dto.admin_fullname,
            email: dto.admin_email,
            password_hash,
            role: adminRole,
            organization_id: org.id,
            is_active: true,
          }),
        );
        // lengkapi relasi role untuk pembuatan token.
        user.role = adminRole;
        return { org, user };
      });

      return {
        organization: { id: org.id, name: org.name, slug: org.slug },
        user: { id: user.id, email: user.email, role: 'Admin' },
        ...(await this.tokens.issue(user)),
      };
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Email atau slug sudah terdaftar');
      }
      throw err;
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

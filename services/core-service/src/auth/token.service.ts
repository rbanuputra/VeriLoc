import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/**
 * Mengelola access token (JWT) + refresh token (opaque, revocable).
 * Refresh token disimpan sebagai hash; rotasi setiap kali dipakai.
 */
@Injectable()
export class TokenService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {
    this.refreshTtlMs = this.parseDurationMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
  }

  /** Terbitkan pasangan access + refresh untuk user. */
  async issue(user: User): Promise<TokenPair> {
    const access_token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      organization_id: user.organization_id,
    });

    const raw = randomBytes(48).toString('hex');
    await this.refreshRepo.save(
      this.refreshRepo.create({
        user_id: user.id,
        token_hash: this.hash(raw),
        expires_at: new Date(Date.now() + this.refreshTtlMs),
      }),
    );

    return { access_token, refresh_token: raw };
  }

  /**
   * Validasi refresh token, revoke yang lama (rotasi), kembalikan record valid.
   * @returns user_id pemilik token.
   */
  async consume(rawToken: string): Promise<string> {
    const record = await this.refreshRepo.findOne({
      where: { token_hash: this.hash(rawToken), revoked: false },
    });
    if (!record || record.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token tidak valid/kedaluwarsa');
    }
    record.revoked = true;
    await this.refreshRepo.save(record);
    return record.user_id;
  }

  /** Cabut satu refresh token (logout). Idempotent. */
  async revoke(rawToken: string): Promise<void> {
    await this.refreshRepo.update(
      { token_hash: this.hash(rawToken) },
      { revoked: true },
    );
  }

  /** Cabut SEMUA refresh token milik user (mis. setelah ganti password). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshRepo.update(
      { user_id: userId, revoked: false },
      { revoked: true },
    );
  }

  /** Bersihkan token kedaluwarsa (bisa dipanggil terjadwal). */
  async purgeExpired(): Promise<void> {
    await this.refreshRepo.delete({ expires_at: LessThan(new Date()) });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(s: string): number {
    const m = /^(\d+)([smhd])$/.exec(s.trim());
    if (!m) return 7 * 86_400_000;
    const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]!;
    return Number(m[1]) * unit;
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Refresh token opaque (bukan JWT) yang disimpan sebagai HASH untuk revocation.
 * Token asli hanya ada di klien; server hanya menyimpan sha256-nya.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  user_id!: string;

  @Index()
  @Column()
  token_hash!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}

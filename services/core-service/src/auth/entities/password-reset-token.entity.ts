import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Token reset password (disimpan sebagai hash, sekali pakai). */
@Entity('password_reset_tokens')
export class PasswordResetToken {
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
  used!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}

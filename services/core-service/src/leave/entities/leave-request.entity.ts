import { User } from 'src/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

export enum LeaveType {
  CUTI = 'CUTI', // cuti tahunan
  IZIN = 'IZIN', // izin keperluan pribadi
  SAKIT = 'SAKIT', // sakit
  LEMBUR = 'LEMBUR', // pengajuan lembur
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Pengajuan cuti/izin/sakit/lembur. Reuse BaseTenantEntity → otomatis punya
 * id, organization_id, created_at, updated_at.
 */
@Entity('leave_requests')
@Index(['organization_id', 'status'])
export class LeaveRequest extends BaseTenantEntity {
  @Index()
  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar' })
  type!: LeaveType;

  @Column({ type: 'date' })
  start_date!: string;

  @Column({ type: 'date' })
  end_date!: string;

  @Column({ type: 'text' })
  reason!: string;

  // Jam lembur (hanya dipakai saat type = LEMBUR). null untuk cuti/izin/sakit.
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  hours!: number | null;

  @Column({ type: 'varchar', default: LeaveStatus.PENDING })
  status!: LeaveStatus;

  // Approver (Admin/HRD) — diisi saat approve/reject.
  @Column('uuid', { nullable: true })
  reviewed_by!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  review_note!: string | null;
}

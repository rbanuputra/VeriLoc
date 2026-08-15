import { User } from 'src/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';

/** Satu baris komponen dalam rincian slip gaji. */
export interface PayslipLine {
  label: string;
  amount: number;
}

/**
 * Slip gaji hasil perhitungan (snapshot). Disimpan agar arsip tetap ada
 * walau kontrak berubah. Unik per (user, period).
 */
@Entity('payroll_records')
@Unique(['organization_id', 'user_id', 'period'])
@Index(['organization_id', 'period'])
export class PayrollRecord extends BaseTenantEntity {
  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('uuid')
  contract_id!: string;

  /** Periode gaji, format YYYY-MM. */
  @Column({ type: 'varchar', length: 7 })
  period!: string;

  // Ringkasan kehadiran yang dipakai
  @Column('int')
  present_days!: number;

  @Column('int')
  absent_days!: number;

  @Column('decimal', { precision: 6, scale: 2 })
  overtime_hours!: number;

  // Angka gaji (semua Rp)
  @Column('decimal', { precision: 14, scale: 2 })
  gross!: number; // total pendapatan kena/tak kena pajak

  @Column('decimal', { precision: 14, scale: 2 })
  total_earning!: number;

  @Column('decimal', { precision: 14, scale: 2 })
  total_deduction!: number;

  @Column('decimal', { precision: 14, scale: 2 })
  bpjs_employee!: number;

  @Column('decimal', { precision: 14, scale: 2 })
  pph21!: number;

  @Column('decimal', { precision: 14, scale: 2 })
  net!: number; // gaji dibawa pulang

  /** Rincian lengkap (earnings, deductions, pajak) untuk ditampilkan. */
  @Column({ type: 'jsonb' })
  breakdown!: {
    earnings: PayslipLine[];
    deductions: PayslipLine[];
  };
}

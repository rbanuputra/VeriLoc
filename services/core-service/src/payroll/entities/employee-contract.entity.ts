import { User } from 'src/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { ContractComponent } from './contract-component.entity';

export enum ContractType {
  TETAP = 'TETAP', // karyawan tetap
  KONTRAK = 'KONTRAK', // PKWT
  PARUH_WAKTU = 'PARUH_WAKTU',
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

/**
 * Status PTKP (Penghasilan Tidak Kena Pajak) untuk perhitungan PPh21.
 * TK = tidak kawin, K = kawin; angka = jumlah tanggungan (maks 3).
 */
export enum PtkpStatus {
  TK0 = 'TK/0',
  TK1 = 'TK/1',
  TK2 = 'TK/2',
  TK3 = 'TK/3',
  K0 = 'K/0',
  K1 = 'K/1',
  K2 = 'K/2',
  K3 = 'K/3',
}

/**
 * Kontrak kerja karyawan. Menyimpan gaji pokok, T&C, parameter perhitungan
 * (dipakai engine payroll), status PTKP, dan flag BPJS. Satu karyawan
 * idealnya punya satu kontrak ACTIVE.
 */
@Entity('employee_contracts')
@Index(['organization_id', 'user_id'])
export class EmployeeContract extends BaseTenantEntity {
  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', default: ContractType.TETAP })
  type!: ContractType;

  @Column('decimal', { precision: 14, scale: 2 })
  base_salary!: number;

  // Parameter perhitungan (di-set HRD, dibaca engine) --------------------
  /** Hari kerja standar per bulan (basis potongan absen & pembagi harian). */
  @Column({ type: 'int', default: 22 })
  standard_working_days!: number;

  /** Upah lembur per JAM (× total jam lembur yang di-approve). */
  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  overtime_rate_per_hour!: number;

  /**
   * Potongan per hari absen tanpa keterangan. null = otomatis dari
   * base_salary / standard_working_days.
   */
  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  absence_deduction_per_day!: number | null;

  // Pajak & BPJS ---------------------------------------------------------
  @Column({ type: 'varchar', default: PtkpStatus.TK0 })
  ptkp_status!: PtkpStatus;

  @Column({ default: true })
  bpjs_kesehatan!: boolean;

  @Column({ default: true })
  bpjs_jht!: boolean;

  @Column({ default: true })
  bpjs_jp!: boolean;

  // ---------------------------------------------------------------------
  @Column({ type: 'text', nullable: true })
  terms!: string | null; // Syarat & ketentuan (T&C)

  @Column({ type: 'date' })
  start_date!: string;

  @Column({ type: 'date', nullable: true })
  end_date!: string | null;

  @Column({ type: 'varchar', default: ContractStatus.ACTIVE })
  status!: ContractStatus;

  @OneToMany(() => ContractComponent, (c) => c.contract, {
    cascade: true,
    eager: true,
  })
  components!: ContractComponent[];
}

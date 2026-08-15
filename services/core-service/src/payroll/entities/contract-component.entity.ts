import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EmployeeContract } from './employee-contract.entity';

export enum ComponentKind {
  EARNING = 'EARNING', // tunjangan / bonus (menambah gaji)
  DEDUCTION = 'DEDUCTION', // potongan (mengurangi gaji)
}

export enum ComponentCalc {
  FIXED = 'FIXED', // nilai tetap (Rp)
  PERCENT = 'PERCENT', // persen dari gaji pokok
}

/**
 * Komponen gaji yang menempel ke kontrak: tunjangan/bonus (EARNING) atau
 * potongan (DEDUCTION), bernilai tetap (Rp) atau persen dari base_salary.
 * `taxable` menentukan apakah komponen ikut menambah dasar pajak PPh21.
 */
@Entity('contract_components')
export class ContractComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  contract_id!: string;

  @ManyToOne(() => EmployeeContract, (c) => c.components, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: EmployeeContract;

  @Column({ type: 'varchar' })
  kind!: ComponentKind;

  @Column()
  name!: string;

  @Column({ type: 'varchar', default: ComponentCalc.FIXED })
  calc!: ComponentCalc;

  /** Nilai Rp (FIXED) atau persen 0..100 (PERCENT). */
  @Column('decimal', { precision: 14, scale: 2 })
  value!: number;

  @Column({ default: true })
  taxable!: boolean;
}

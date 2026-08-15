import { IsOptional, IsUUID, Matches } from 'class-validator';

export class RunPayrollDto {
  /** Periode gaji, format YYYY-MM (mis. 2026-08). */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period harus format YYYY-MM' })
  period!: string;

  /** Opsional: hitung 1 karyawan saja. Kosong = semua kontrak aktif. */
  @IsOptional()
  @IsUUID()
  user_id?: string;
}

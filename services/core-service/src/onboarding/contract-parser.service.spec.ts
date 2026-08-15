import { ContractParserService } from './contract-parser.service';
import { ComponentKind } from '../payroll/entities/contract-component.entity';

describe('ContractParserService', () => {
  const parser = new ContractParserService();

  const sample = `
    PERJANJIAN KERJA
    Gaji Pokok: Rp 8.500.000 per bulan
    Tunjangan Transport Rp 500.000
    Tunjangan Makan: Rp 750.000
    Potongan Koperasi Rp 100.000
    Upah lembur per jam sebesar Rp 50.000
    Syarat dan ketentuan: jam kerja 09.00-17.00.
  `;

  it('mengekstrak gaji pokok', () => {
    expect(parser.parse(sample).base_salary).toBe(8_500_000);
  });

  it('mengekstrak tarif lembur per jam', () => {
    expect(parser.parse(sample).overtime_rate_per_hour).toBe(50_000);
  });

  it('mengekstrak tunjangan (EARNING) dan potongan (DEDUCTION)', () => {
    const r = parser.parse(sample);
    const earnings = r.components.filter((c) => c.kind === ComponentKind.EARNING);
    const deductions = r.components.filter(
      (c) => c.kind === ComponentKind.DEDUCTION,
    );
    expect(earnings.length).toBeGreaterThanOrEqual(2);
    expect(deductions.some((d) => d.value === 100_000)).toBe(true);
  });

  it('memberi catatan bila gaji pokok tidak terbaca', () => {
    const r = parser.parse('Dokumen tanpa angka gaji.');
    expect(r.base_salary).toBeNull();
    expect(r.notes.length).toBeGreaterThan(0);
  });
});

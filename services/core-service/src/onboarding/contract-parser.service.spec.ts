import { ContractParserService } from './contract-parser.service';
import { ComponentKind } from '../payroll/entities/contract-component.entity';

describe('ContractParserService (tanpa template)', () => {
  const parser = new ContractParserService();

  // Kontrak bebas & "berantakan": pemisah campur (:, =, tanpa pemisah),
  // format Rp beragam, dan ada salah ketik OCR ("Pokk").
  const messy = `
    SURAT PERJANJIAN KERJA
    Gaji Pokk   Rp 8.500.000,-
    Tunjangan Transport : Rp500.000
    Tunjangan Makan   Rp 750.000
    Potongan Koperasi = Rp 100.000
    Tarif Lembur per Jam  Rp 50.000
    Status PTKP K/1
    Hari kerja per bulan 22 hari
  `;

  it('gaji pokok terbaca walau salah ketik & tanpa pemisah', () => {
    expect(parser.parse(messy).base_salary).toBe(8_500_000);
  });

  it('tarif lembur per jam terbaca', () => {
    expect(parser.parse(messy).overtime_rate_per_hour).toBe(50_000);
  });

  it('PTKP & hari kerja terbaca', () => {
    const r = parser.parse(messy);
    expect(r.ptkp_status).toBe('K/1');
    expect(r.standard_working_days).toBe(22);
  });

  it('deteksi tunjangan (earning) & potongan (deduction) otomatis', () => {
    const r = parser.parse(messy);
    const earn = r.components.filter((c) => c.kind === ComponentKind.EARNING);
    const deduct = r.components.filter((c) => c.kind === ComponentKind.DEDUCTION);
    expect(earn.map((c) => c.value)).toEqual(
      expect.arrayContaining([500_000, 750_000]),
    );
    expect(deduct.some((d) => d.value === 100_000)).toBe(true);
  });

  it('nilai bertanda kurung [ ] tetap terbaca (kompatibel)', () => {
    const r = parser.parse('Gaji Pokok : Rp [9.250.000]');
    expect(r.base_salary).toBe(9_250_000);
  });

  it('memberi catatan bila gaji pokok tidak ada', () => {
    const r = parser.parse('Dokumen tanpa nominal gaji.');
    expect(r.base_salary).toBeNull();
    expect(r.notes.length).toBeGreaterThan(0);
  });
});

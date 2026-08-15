import { BpjsService } from './bpjs.service';
import { TaxService } from './tax.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import {
  ContractStatus,
  ContractType,
  EmployeeContract,
  PtkpStatus,
} from '../entities/employee-contract.entity';
import {
  ComponentCalc,
  ComponentKind,
} from '../entities/contract-component.entity';

function contract(over: Partial<EmployeeContract> = {}): EmployeeContract {
  return {
    id: 'c1',
    organization_id: 'org',
    user_id: 'u1',
    type: ContractType.TETAP,
    base_salary: 10_000_000,
    standard_working_days: 22,
    overtime_rate_per_hour: 50_000,
    absence_deduction_per_day: null,
    ptkp_status: PtkpStatus.TK0,
    bpjs_kesehatan: true,
    bpjs_jht: true,
    bpjs_jp: true,
    terms: null,
    start_date: '2026-01-01',
    end_date: null,
    status: ContractStatus.ACTIVE,
    components: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  } as EmployeeContract;
}

describe('PayrollCalculatorService', () => {
  const calc = new PayrollCalculatorService(new TaxService(), new BpjsService());

  it('gaji penuh TER: BPJS 4%, PPh21 pakai tarif efektif bulanan', () => {
    const r = calc.compute(
      contract(),
      { presentDays: 22, absentDays: 0, overtimeHours: 0 },
      { month: 8, priorPph21Ytd: 0 },
    );
    expect(r.gross).toBe(10_000_000);
    expect(r.bpjs_employee).toBe(400_000); // 1+2+1% dari 10jt
    // TER Kategori A @ 10jt = 2% → 200.000
    expect(r.pph21).toBe(200_000);
    expect(r.net).toBe(r.total_earning - r.total_deduction);
  });

  it('lembur per-jam menambah pendapatan (jam × tarif/jam)', () => {
    const r = calc.compute(
      contract(),
      { presentDays: 22, absentDays: 0, overtimeHours: 12 },
      { month: 8, priorPph21Ytd: 0 },
    );
    const lembur = r.breakdown.earnings.find((e) => e.label.startsWith('Lembur'));
    expect(lembur?.amount).toBe(12 * 50_000); // 600.000
  });

  it('potongan absen otomatis dari base/hari kerja', () => {
    const r = calc.compute(
      contract(),
      { presentDays: 20, absentDays: 2, overtimeHours: 0 },
      { month: 8, priorPph21Ytd: 0 },
    );
    const perDay = Math.round(10_000_000 / 22);
    const absen = r.breakdown.deductions.find((d) =>
      d.label.startsWith('Potongan Absen'),
    );
    expect(absen?.amount).toBe(2 * perDay);
  });

  it('penghasilan di bawah lapisan TER terendah → PPh21 nol', () => {
    const r = calc.compute(
      contract({ base_salary: 4_000_000 }),
      { presentDays: 22, absentDays: 0, overtimeHours: 0 },
      { month: 8, priorPph21Ytd: 0 },
    );
    expect(r.pph21).toBe(0);
  });

  it('Desember: rekalkulasi tahunan (Pasal 17) − TER yang sudah dipotong', () => {
    const r = calc.compute(
      contract(),
      { presentDays: 22, absentDays: 0, overtimeHours: 0 },
      { month: 12, priorPph21Ytd: 2_200_000 }, // 11 bulan × 200rb
    );
    // Desember pakai penyesuaian tahunan, beda dari TER bulanan biasa.
    const line = r.breakdown.deductions.find((d) =>
      d.label.includes('Desember'),
    );
    expect(line).toBeDefined();
  });
});

import { Injectable } from '@nestjs/common';
import {
  ComponentCalc,
  ComponentKind,
} from '../entities/contract-component.entity';
import { EmployeeContract } from '../entities/employee-contract.entity';
import { PayslipLine } from '../entities/payroll-record.entity';
import { BpjsService } from './bpjs.service';
import { TaxService } from './tax.service';

/** Statistik kehadiran satu karyawan pada periode tertentu. */
export interface AttendanceStats {
  presentDays: number;
  absentDays: number;
  overtimeHours: number;
}

/** Konteks pajak: bulan periode + total PPh21 TER yang sudah dipotong Jan–Nov. */
export interface TaxContext {
  month: number; // 1..12
  priorPph21Ytd: number; // untuk rekalkulasi Desember
}

export interface PayrollComputation {
  present_days: number;
  absent_days: number;
  overtime_hours: number;
  gross: number;
  total_earning: number;
  total_deduction: number;
  bpjs_employee: number;
  pph21: number;
  net: number;
  breakdown: { earnings: PayslipLine[]; deductions: PayslipLine[] };
}

/**
 * Inti perhitungan gaji. Menggabungkan parameter kontrak + statistik absensi
 * menjadi rincian slip gaji lengkap (termasuk PPh21 metode TER / Desember).
 */
@Injectable()
export class PayrollCalculatorService {
  constructor(
    private readonly tax: TaxService,
    private readonly bpjs: BpjsService,
  ) {}

  compute(
    contract: EmployeeContract,
    stats: AttendanceStats,
    taxCtx: TaxContext = { month: 1, priorPph21Ytd: 0 },
  ): PayrollComputation {
    const base = Number(contract.base_salary);
    const earnings: PayslipLine[] = [];
    const deductions: PayslipLine[] = [];

    // --- Pendapatan ---
    earnings.push({ label: 'Gaji Pokok', amount: base });

    const overtimePay = Math.round(
      stats.overtimeHours * Number(contract.overtime_rate_per_hour),
    );
    if (overtimePay > 0) {
      earnings.push({
        label: `Lembur (${stats.overtimeHours} jam)`,
        amount: overtimePay,
      });
    }

    let taxableGross = base + overtimePay; // gaji pokok & lembur kena pajak
    for (const c of contract.components ?? []) {
      if (c.kind !== ComponentKind.EARNING) continue;
      const amount = this.amountOf(c.calc, Number(c.value), base);
      earnings.push({ label: c.name, amount });
      if (c.taxable) taxableGross += amount;
    }

    // --- Potongan (absensi) ---
    const perDay =
      contract.absence_deduction_per_day != null
        ? Number(contract.absence_deduction_per_day)
        : Math.round(base / contract.standard_working_days);
    const absencePenalty = stats.absentDays * perDay;
    if (absencePenalty > 0) {
      deductions.push({
        label: `Potongan Absen (${stats.absentDays} hari)`,
        amount: absencePenalty,
      });
    }

    // --- Potongan (komponen kontrak) ---
    for (const c of contract.components ?? []) {
      if (c.kind !== ComponentKind.DEDUCTION) continue;
      const amount = this.amountOf(c.calc, Number(c.value), base);
      deductions.push({ label: c.name, amount });
    }

    const totalEarning = earnings.reduce((s, e) => s + e.amount, 0);
    const gross = totalEarning;

    // --- BPJS (porsi karyawan) ---
    const bpjs = this.bpjs.employeeContribution(gross, contract);
    if (bpjs.kesehatan)
      deductions.push({ label: 'BPJS Kesehatan (1%)', amount: bpjs.kesehatan });
    if (bpjs.jht) deductions.push({ label: 'BPJS JHT (2%)', amount: bpjs.jht });
    if (bpjs.jp) deductions.push({ label: 'BPJS JP (1%)', amount: bpjs.jp });

    // --- PPh21 (TER Jan–Nov, rekalkulasi tahunan di Desember) ---
    const pph21 = this.computePph21(contract, taxableGross, bpjs.total, taxCtx);
    if (pph21 !== 0) {
      deductions.push({
        label: taxCtx.month === 12 ? 'PPh21 (penyesuaian Desember)' : 'PPh21 (TER)',
        amount: pph21,
      });
    }

    const totalDeduction = deductions.reduce((s, d) => s + d.amount, 0);
    const net = totalEarning - totalDeduction;

    return {
      present_days: stats.presentDays,
      absent_days: stats.absentDays,
      overtime_hours: stats.overtimeHours,
      gross,
      total_earning: totalEarning,
      total_deduction: totalDeduction,
      bpjs_employee: bpjs.total,
      pph21,
      net,
      breakdown: { earnings, deductions },
    };
  }

  private computePph21(
    contract: EmployeeContract,
    monthlyTaxableGross: number,
    monthlyBpjs: number,
    ctx: TaxContext,
  ): number {
    if (ctx.month === 12) {
      // Rekalkulasi tahunan (disetahunkan dari bulan ini) − TER Jan–Nov.
      return this.tax.decemberPph21(
        monthlyTaxableGross * 12,
        contract.ptkp_status,
        monthlyBpjs * 12,
        ctx.priorPph21Ytd,
      );
    }
    return this.tax.monthlyTer(monthlyTaxableGross, contract.ptkp_status);
  }

  private amountOf(calc: ComponentCalc, value: number, base: number): number {
    return calc === ComponentCalc.PERCENT
      ? Math.round((base * value) / 100)
      : value;
  }
}

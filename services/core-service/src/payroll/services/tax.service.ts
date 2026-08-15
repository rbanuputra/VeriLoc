import { Injectable } from '@nestjs/common';
import { PtkpStatus } from '../entities/employee-contract.entity';
import {
  BIAYA_JABATAN_MAX_ANNUAL,
  BIAYA_JABATAN_RATE,
  PPH21_BRACKETS,
  PTKP_ANNUAL,
} from '../config/id-tax.config';
import { terRate } from '../config/id-ter.config';

/**
 * Perhitungan PPh21 sesuai PP 58/2023:
 *  - Masa Jan–Nov  : metode TER (bruto bulanan × tarif efektif).
 *  - Masa Desember : rekalkulasi tahunan (Pasal 17) dikurangi total TER
 *                    yang sudah dipotong Jan–Nov.
 * ⚠️ Baseline; validasi dengan akuntan. Parameter di id-tax.config.ts & id-ter.config.ts.
 */
@Injectable()
export class TaxService {
  /** PPh21 masa Jan–Nov dengan metode TER. */
  monthlyTer(monthlyTaxableGross: number, ptkp: PtkpStatus): number {
    return Math.round(monthlyTaxableGross * terRate(ptkp, monthlyTaxableGross));
  }

  /**
   * PPh21 masa DESEMBER = pajak setahun (Pasal 17) − yang sudah dipotong TER.
   * Bisa negatif (lebih bayar/restitusi).
   */
  decemberPph21(
    annualTaxableGross: number,
    ptkp: PtkpStatus,
    annualBpjsDeductible: number,
    priorWithheldYtd: number,
  ): number {
    const annual = this.annualPph21(
      annualTaxableGross,
      ptkp,
      annualBpjsDeductible,
    );
    return Math.round(annual - priorWithheldYtd);
  }

  /** Pajak PPh21 SETAHUN penuh (metode netto Pasal 17). */
  annualPph21(
    annualGross: number,
    ptkp: PtkpStatus,
    annualBpjsDeductible = 0,
  ): number {
    const biayaJabatan = Math.min(
      annualGross * BIAYA_JABATAN_RATE,
      BIAYA_JABATAN_MAX_ANNUAL,
    );
    const annualNetto = annualGross - biayaJabatan - annualBpjsDeductible;
    const pkp = Math.max(
      0,
      Math.floor((annualNetto - PTKP_ANNUAL[ptkp]) / 1000) * 1000,
    );
    if (pkp <= 0) return 0;
    return this.progressive(pkp);
  }

  /** Terapkan lapisan tarif progresif atas PKP. */
  private progressive(pkp: number): number {
    let remaining = pkp;
    let prevCap = 0;
    let tax = 0;
    for (const { upTo, rate } of PPH21_BRACKETS) {
      const slice = Math.min(remaining, upTo - prevCap);
      if (slice <= 0) break;
      tax += slice * rate;
      remaining -= slice;
      prevCap = upTo;
    }
    return tax;
  }
}

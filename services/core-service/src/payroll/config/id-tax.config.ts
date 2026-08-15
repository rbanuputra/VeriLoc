/**
 * Parameter pajak & BPJS Indonesia — TERPUSAT di sini biar gampang di-update
 * tiap regulasi berubah.
 *
 * ⚠️ WAJIB DIVALIDASI AKUNTAN/PAYROLL kamu & di-update tiap tahun.
 * Sumber acuan: UU HPP (PPh21 Pasal 17) + PTKP 2016 + BPJS 2024.
 * Metode: progresif tahunan (netto disetahunkan) — bukan TER 2024.
 */

import { PtkpStatus } from '../entities/employee-contract.entity';

export const TAX_CONFIG_VERSION = '2024-baseline';

/** PTKP tahunan (Rupiah) per status. */
export const PTKP_ANNUAL: Record<PtkpStatus, number> = {
  [PtkpStatus.TK0]: 54_000_000,
  [PtkpStatus.TK1]: 58_500_000,
  [PtkpStatus.TK2]: 63_000_000,
  [PtkpStatus.TK3]: 67_500_000,
  [PtkpStatus.K0]: 58_500_000,
  [PtkpStatus.K1]: 63_000_000,
  [PtkpStatus.K2]: 67_500_000,
  [PtkpStatus.K3]: 72_000_000,
};

/** Lapisan tarif PPh21 progresif (UU HPP), batas atas & tarif. */
export const PPH21_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 60_000_000, rate: 0.05 },
  { upTo: 250_000_000, rate: 0.15 },
  { upTo: 500_000_000, rate: 0.25 },
  { upTo: 5_000_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

/** Biaya jabatan: 5% dari bruto, maksimal 6.000.000/tahun (500rb/bulan). */
export const BIAYA_JABATAN_RATE = 0.05;
export const BIAYA_JABATAN_MAX_ANNUAL = 6_000_000;

/**
 * BPJS — porsi yang dipotong dari GAJI KARYAWAN (bukan porsi perusahaan).
 * cap = batas atas upah untuk basis perhitungan (0 = tanpa cap).
 */
export const BPJS = {
  KESEHATAN: { employeeRate: 0.01, cap: 12_000_000 }, // 1%, cap upah 12jt
  JHT: { employeeRate: 0.02, cap: 0 }, // 2%, tanpa cap
  JP: { employeeRate: 0.01, cap: 10_547_400 }, // 1%, cap upah (2024)
};

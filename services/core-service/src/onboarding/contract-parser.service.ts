import { Injectable } from '@nestjs/common';
import {
  ComponentCalc,
  ComponentKind,
} from '../payroll/entities/contract-component.entity';

export interface ParsedComponent {
  kind: ComponentKind;
  name: string;
  calc: ComponentCalc;
  value: number;
  taxable: boolean;
}

export interface ParsedContract {
  base_salary: number | null;
  overtime_rate_per_hour: number | null;
  components: ParsedComponent[];
  terms: string;
  /** Catatan untuk HRD saat review (mis. field yang tidak terbaca). */
  notes: string[];
}

/**
 * Mengubah teks hasil OCR kontrak → draft data terstruktur (heuristik/regex
 * untuk istilah gaji Indonesia). Hasilnya SELALU untuk di-review HRD, bukan
 * final — OCR + parsing tidak dijamin 100% akurat.
 */
@Injectable()
export class ContractParserService {
  parse(text: string): ParsedContract {
    const notes: string[] = [];

    const base_salary = this.findAmountNear(text, [
      'gaji pokok',
      'gaji dasar',
      'basic salary',
    ]);
    if (base_salary == null) notes.push('Gaji pokok tidak terbaca — isi manual');

    const overtime_rate_per_hour = this.findAmountNear(text, [
      'lembur per jam',
      'upah lembur',
      'overtime per hour',
    ]);

    const components: ParsedComponent[] = [
      ...this.findComponents(text, /tunjangan\s+([a-z\s]{2,30}?)/gi, ComponentKind.EARNING),
      ...this.findComponents(text, /bonus\s+([a-z\s]{2,30}?)/gi, ComponentKind.EARNING),
      ...this.findComponents(text, /potongan\s+([a-z\s]{2,30}?)/gi, ComponentKind.DEDUCTION),
    ];
    if (!components.length)
      notes.push('Tidak ada tunjangan/potongan terdeteksi — tambah manual bila perlu');

    return {
      base_salary,
      overtime_rate_per_hour,
      components,
      terms: text.trim().slice(0, 5000),
      notes,
    };
  }

  /** Cari nominal Rp yang paling dekat setelah salah satu keyword. */
  private findAmountNear(text: string, keywords: string[]): number | null {
    const lower = text.toLowerCase();
    for (const kw of keywords) {
      const idx = lower.indexOf(kw);
      if (idx === -1) continue;
      const window = text.slice(idx, idx + 120);
      const amount = this.parseRupiah(window);
      if (amount != null) return amount;
    }
    return null;
  }

  /** Temukan komponen bernama + nominal pada satu baris. */
  private findComponents(
    text: string,
    labelRe: RegExp,
    kind: ComponentKind,
  ): ParsedComponent[] {
    const out: ParsedComponent[] = [];
    for (const line of text.split(/\n+/)) {
      labelRe.lastIndex = 0;
      const m = labelRe.exec(line);
      if (!m) continue;
      const amount = this.parseRupiah(line);
      if (amount == null) continue;
      out.push({
        kind,
        name: this.titleCase(m[0].trim()),
        calc: ComponentCalc.FIXED,
        value: amount,
        taxable: kind === ComponentKind.EARNING,
      });
    }
    return out;
  }

  /** Ekstrak angka Rupiah pertama dari sebuah teks. "Rp 10.000.000" → 10000000. */
  private parseRupiah(s: string): number | null {
    const m = /rp\.?\s*([\d][\d.\s]{2,})/i.exec(s);
    if (!m) return null;
    const digits = m[1].replace(/[.\s]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private titleCase(s: string): string {
    return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
  }
}

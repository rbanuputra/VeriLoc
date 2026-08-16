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
  ptkp_status: string | null;
  standard_working_days: number | null;
  components: ParsedComponent[];
  terms: string;
  /** Catatan untuk HRD saat review (mis. field yang tidak terbaca). */
  notes: string[];
}

/**
 * Ekstraksi cerdas data kontrak dari teks OCR — TANPA butuh template.
 * Teknik (semuanya lokal & gratis):
 *  - Normalisasi teks & perbaikan galat OCR umum.
 *  - Pencocokan label secara fuzzy (tahan salah ketik OCR, mis. "Pokk" → "Pokok").
 *  - Ekstraksi nilai fleksibel: pemisah ":", "=", spasi, atau baris berikutnya.
 *  - Parser Rupiah yang toleran berbagai format ("Rp8.000.000", "IDR 8,000,000", dst).
 *  - Deteksi tunjangan/potongan secara generik (nama apa pun).
 * Hasil TETAP untuk di-review HRD.
 */
@Injectable()
export class ContractParserService {
  private readonly EARN_KEYS = ['tunjangan', 'bonus', 'insentif', 'komisi'];
  private readonly DEDUCT_KEYS = [
    'potongan',
    'iuran',
    'pinjaman',
    'pph',
    'bpjs',
  ];

  parse(text: string): ParsedContract {
    const lines = this.normalize(text)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const notes: string[] = [];

    const base_salary = this.findMoneyField(lines, [
      'gaji pokok',
      'gaji dasar',
      'gaji bulanan',
      'upah pokok',
      'basic salary',
    ]);
    if (base_salary == null) notes.push('Gaji pokok tidak terbaca — isi manual');

    const overtime_rate_per_hour = this.findMoneyField(lines, [
      'tarif lembur per jam',
      'upah lembur per jam',
      'uang lembur per jam',
      'lembur per jam',
      'overtime per hour',
    ]);
    const ptkp_status = this.findPtkp(lines.join('\n'));
    const standard_working_days = this.findWorkingDays(lines);
    const components = this.findComponents(lines);
    if (!components.length)
      notes.push('Tidak ada tunjangan/potongan terdeteksi — tambah bila perlu');

    return {
      base_salary,
      overtime_rate_per_hour,
      ptkp_status,
      standard_working_days,
      components,
      terms: text.trim().slice(0, 5000),
      notes,
    };
  }

  // ---------- Normalisasi ----------

  private normalize(text: string): string {
    return text
      .replace(/\r/g, '')
      .replace(/[•▪·*]/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/rp\s*\./gi, 'Rp ') // "Rp." → "Rp"
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n');
  }

  /** Pisah baris menjadi [label, value] pada pemisah ":" atau "=" pertama. */
  private splitKV(line: string): [string, string] {
    const m = /^(.*?)[:=]\s*(.*)$/.exec(line);
    return m ? [m[1], m[2]] : [line, ''];
  }

  private clean(s: string): string {
    return s
      .toLowerCase()
      .replace(/^[a-z0-9]{1,2}[.)]\s*/i, '') // buang enumerasi "a." / "1)"
      .replace(/[^a-z0-9/ ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------- Pencocokan label (fuzzy) ----------

  private findMoneyField(lines: string[], synonyms: string[]): number | null {
    for (let i = 0; i < lines.length; i++) {
      const [label, value] = this.splitKV(lines[i]);
      if (!this.labelMatches(label, synonyms)) continue;

      const hasSep = /[:=]/.test(lines[i]);
      // Nilai pada value (setelah pemisah), atau baris yg sama (tanpa pemisah),
      // atau baris berikutnya (label sendiri lalu nilai di bawahnya).
      const money =
        this.extractMoney(value) ??
        (hasSep ? this.extractMoney(lines[i + 1] ?? '') : this.extractMoney(lines[i]));
      if (money != null) return money;
    }
    return null;
  }

  private labelMatches(label: string, synonyms: string[]): boolean {
    const l = this.clean(label);
    if (!l) return false;
    return synonyms.some((s) => {
      const sy = this.clean(s);
      return l.includes(sy) || this.fuzzySubsequence(l, sy);
    });
  }

  /** Semua kata sinonim muncul berurutan di label, toleran 1 galat OCR/kata. */
  private fuzzySubsequence(label: string, syn: string): boolean {
    const lt = label.split(' ');
    const st = syn.split(' ');
    let idx = 0;
    for (const tok of st) {
      let hit = false;
      while (idx < lt.length) {
        if (this.closeWord(lt[idx], tok)) {
          hit = true;
          idx++;
          break;
        }
        idx++;
      }
      if (!hit) return false;
    }
    return true;
  }

  private closeWord(a: string, b: string): boolean {
    if (a === b) return true;
    if (b.length < 4) return false; // hindari false-positive kata pendek
    if (Math.abs(a.length - b.length) > 1) return false;
    return this.levenshtein(a, b) <= 1;
  }

  private levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  // ---------- Ekstraksi nilai ----------

  /** Angka Rupiah dari teks; toleran "Rp8.000.000", "IDR 8,000,000", "[8.000.000]". */
  private extractMoney(s: string): number | null {
    if (!s) return null;
    const m = /(?:rp|idr)?\s*\[?\s*(\d[\d.,\s]*\d|\d)/i.exec(s);
    if (!m) return null;
    let tok = m[1].replace(/\s/g, '');
    tok = tok.replace(/[.,]\d{1,2}$/, ''); // buang desimal ",00"/".00"
    const n = Number(tok.replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n >= 1000 ? n : null;
  }

  private findPtkp(text: string): string | null {
    const m = /\b(TK|K)\s*[\/\-]?\s*([0-3])\b/i.exec(text);
    return m ? `${m[1].toUpperCase()}/${m[2]}` : null;
  }

  private findWorkingDays(lines: string[]): number | null {
    for (const line of lines) {
      const [label, value] = this.splitKV(line);
      if (!this.clean(label).includes('hari kerja')) continue;
      const m = /(\d{1,2})/.exec(value || line);
      if (m) {
        const n = Number(m[1]);
        if (n >= 1 && n <= 31) return n;
      }
    }
    return null;
  }

  // ---------- Komponen (tunjangan / potongan) ----------

  private findComponents(lines: string[]): ParsedComponent[] {
    const out: ParsedComponent[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const [label, value] = this.splitKV(line);
      const l = this.clean(label);
      if (!l) continue;

      let kind: ComponentKind | null = null;
      if (this.DEDUCT_KEYS.some((k) => l.includes(k))) kind = ComponentKind.DEDUCTION;
      else if (this.EARN_KEYS.some((k) => l.includes(k))) kind = ComponentKind.EARNING;
      if (!kind) continue;

      const money = this.extractMoney(value) ?? this.extractMoney(label);
      if (money == null) continue;

      const name = this.titleCase(this.clean(label));
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        kind,
        name,
        calc: ComponentCalc.FIXED,
        value: money,
        taxable: kind === ComponentKind.EARNING,
      });
    }
    return out;
  }

  private titleCase(s: string): string {
    return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
  }
}

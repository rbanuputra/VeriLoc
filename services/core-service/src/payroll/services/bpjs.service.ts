import { Injectable } from '@nestjs/common';
import { EmployeeContract } from '../entities/employee-contract.entity';
import { BPJS } from '../config/id-tax.config';

export interface BpjsBreakdown {
  kesehatan: number;
  jht: number;
  jp: number;
  total: number;
}

/**
 * Menghitung potongan BPJS porsi KARYAWAN dari upah bulanan, sesuai flag
 * kepesertaan di kontrak. Semua tarif/cap dari id-tax.config.ts.
 */
@Injectable()
export class BpjsService {
  employeeContribution(
    monthlyGross: number,
    contract: EmployeeContract,
  ): BpjsBreakdown {
    const calc = (rate: number, cap: number) =>
      Math.round((cap > 0 ? Math.min(monthlyGross, cap) : monthlyGross) * rate);

    const kesehatan = contract.bpjs_kesehatan
      ? calc(BPJS.KESEHATAN.employeeRate, BPJS.KESEHATAN.cap)
      : 0;
    const jht = contract.bpjs_jht
      ? calc(BPJS.JHT.employeeRate, BPJS.JHT.cap)
      : 0;
    const jp = contract.bpjs_jp ? calc(BPJS.JP.employeeRate, BPJS.JP.cap) : 0;

    return { kesehatan, jht, jp, total: kesehatan + jht + jp };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate } from '../common/dto/paginated-result';
import { Attendance } from '../attendance/entities/attendance.entity';
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '../leave/entities/leave-request.entity';
import { ContractService } from './contract.service';
import {
  AttendanceStats,
  PayrollCalculatorService,
} from './services/payroll-calculator.service';
import { EmployeeContract } from './entities/employee-contract.entity';
import { PayrollRecord } from './entities/payroll-record.entity';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRecord)
    private readonly payrollRepo: Repository<PayrollRecord>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepo: Repository<LeaveRequest>,
    private readonly contracts: ContractService,
    private readonly calculator: PayrollCalculatorService,
  ) {}

  /**
   * Hitung gaji satu/semua karyawan untuk sebuah periode (YYYY-MM).
   * Idempotent: menjalankan ulang periode yang sama akan menimpa slip lama.
   */
  async run(organizationId: string, period: string, userId?: string) {
    const contracts = userId
      ? [await this.contracts.findActiveByUser(organizationId, userId)]
      : await this.contracts.findAllActive(organizationId);

    const month = Number(period.slice(5, 7));
    const results: PayrollRecord[] = [];
    for (const contract of contracts) {
      const stats = await this.gatherStats(organizationId, contract, period);
      const priorPph21Ytd =
        month === 12
          ? await this.priorTerWithheld(organizationId, contract.user_id, period)
          : 0;
      const c = this.calculator.compute(contract, stats, {
        month,
        priorPph21Ytd,
      });
      results.push(await this.upsert(organizationId, contract, period, c));
    }
    return results;
  }

  /** Total PPh21 (TER) yang sudah dipotong Jan–Nov tahun yang sama. */
  private async priorTerWithheld(
    organizationId: string,
    userId: string,
    period: string,
  ): Promise<number> {
    const year = period.slice(0, 4);
    const prior = await this.payrollRepo.find({
      where: { organization_id: organizationId, user_id: userId },
    });
    return prior
      .filter((p) => p.period.startsWith(year) && p.period < period)
      .reduce((sum, p) => sum + Number(p.pph21), 0);
  }

  /** Daftar slip gaji tenant untuk sebuah periode (Admin/HRD). */
  async findByPeriod(
    organizationId: string,
    period: string,
    pagination?: PaginationQueryDto,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const [data, total] = await this.payrollRepo.findAndCount({
      where: { organization_id: organizationId, period },
      relations: { user: true },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(data, total, page, limit);
  }

  /** Slip gaji milik user sendiri. */
  findMine(organizationId: string, userId: string) {
    return this.payrollRepo.find({
      where: { organization_id: organizationId, user_id: userId },
      order: { period: 'DESC' },
      take: 24,
    });
  }

  // ---- internal ----

  private async gatherStats(
    organizationId: string,
    contract: EmployeeContract,
    period: string,
  ): Promise<AttendanceStats> {
    const start = `${period}-01`;
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1); // awal bulan berikutnya

    // Hari hadir = jumlah tanggal unik dengan CHECK_IN.
    const rows = await this.attendanceRepo.query(
      `SELECT COUNT(DISTINCT DATE(created_at)) AS c
         FROM attendances
        WHERE organization_id = $1 AND user_id = $2 AND type = 'CHECK_IN'
          AND created_at >= $3 AND created_at < $4`,
      [organizationId, contract.user_id, startDate, endDate],
    );
    const presentDays = Number(rows[0]?.c ?? 0);

    // Cuti/izin/sakit yang disetujui = hari "berizin" (tidak dipotong).
    // Lembur disetujui = hari lembur.
    const leaves = await this.leaveRepo.find({
      where: {
        organization_id: organizationId,
        user_id: contract.user_id,
        status: LeaveStatus.APPROVED,
      },
    });

    let excusedDays = 0;
    let overtimeHours = 0;
    for (const lv of leaves) {
      const days = this.overlapDays(lv.start_date, lv.end_date, period);
      if (days <= 0) continue;
      if (lv.type === LeaveType.LEMBUR) {
        // Pakai jam yang diisi; fallback 8 jam/hari bila kosong.
        overtimeHours += lv.hours != null ? Number(lv.hours) : days * 8;
      } else {
        excusedDays += days;
      }
    }

    const absentDays = Math.max(
      0,
      contract.standard_working_days - presentDays - excusedDays,
    );

    return { presentDays, absentDays, overtimeHours };
  }

  /** Jumlah hari kalender sebuah rentang leave yang jatuh dalam periode. */
  private overlapDays(start: string, end: string, period: string): number {
    const mStart = new Date(`${period}-01T00:00:00Z`);
    const mEnd = new Date(mStart);
    mEnd.setUTCMonth(mEnd.getUTCMonth() + 1);
    mEnd.setUTCDate(0); // hari terakhir bulan tsb

    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    const from = s > mStart ? s : mStart;
    const to = e < mEnd ? e : mEnd;
    if (to < from) return 0;
    return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  }

  private async upsert(
    organizationId: string,
    contract: EmployeeContract,
    period: string,
    c: ReturnType<PayrollCalculatorService['compute']>,
  ): Promise<PayrollRecord> {
    const existing = await this.payrollRepo.findOne({
      where: {
        organization_id: organizationId,
        user_id: contract.user_id,
        period,
      },
    });
    const entity = this.payrollRepo.create({
      ...(existing ?? {}),
      organization_id: organizationId,
      user_id: contract.user_id,
      contract_id: contract.id,
      period,
      ...c,
    });
    return this.payrollRepo.save(entity);
  }
}

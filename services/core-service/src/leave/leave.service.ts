import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTenantService } from '../common/services/base-tenant.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from './entities/leave-request.entity';

/**
 * Reuse BaseTenantService → CRUD dasar sudah ter-scope tenant otomatis.
 * Di sini hanya menambah logika spesifik: pengajuan oleh user + approval flow.
 */
@Injectable()
export class LeaveService extends BaseTenantService<LeaveRequest> {
  constructor(
    @InjectRepository(LeaveRequest)
    repo: Repository<LeaveRequest>,
  ) {
    super(repo, 'Pengajuan');
  }

  /** Ajukan cuti/izin/lembur untuk diri sendiri. */
  async request(
    organizationId: string,
    userId: string,
    dto: CreateLeaveDto,
  ): Promise<LeaveRequest> {
    if (dto.end_date < dto.start_date) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    }
    if (dto.type === LeaveType.LEMBUR && !dto.hours) {
      throw new BadRequestException('Lembur wajib mengisi jumlah jam (hours)');
    }
    return this.create(organizationId, {
      user_id: userId,
      type: dto.type,
      start_date: dto.start_date,
      end_date: dto.end_date,
      reason: dto.reason,
      hours: dto.type === LeaveType.LEMBUR ? dto.hours : null,
      status: LeaveStatus.PENDING,
    });
  }

  /** Riwayat pengajuan milik user (dalam tenant). */
  findMine(
    organizationId: string,
    userId: string,
    pagination: PaginationQueryDto,
  ) {
    return this.findAll(organizationId, pagination, {
      where: { user_id: userId },
    });
  }

  /** Daftar pengajuan tenant, opsional filter status (Admin/HRD). */
  findForOrg(
    organizationId: string,
    pagination: PaginationQueryDto,
    status?: LeaveStatus,
  ) {
    return this.findAll(organizationId, pagination, {
      where: status ? { status } : {},
      relations: { user: true },
    });
  }

  /** Approve/reject sebuah pengajuan (hanya yang masih PENDING). */
  async review(
    organizationId: string,
    id: string,
    reviewerId: string,
    status: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
    note?: string,
  ): Promise<LeaveRequest> {
    const leave = await this.findOne(organizationId, id);
    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Pengajuan sudah ${leave.status}, tidak bisa diubah`,
      );
    }
    leave.status = status;
    leave.reviewed_by = reviewerId;
    leave.reviewed_at = new Date();
    leave.review_note = note ?? null;
    return this.repository.save(leave);
  }
}

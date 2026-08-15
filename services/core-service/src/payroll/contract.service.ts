import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseTenantService } from '../common/services/base-tenant.service';
import { CreateContractDto } from './dto/create-contract.dto';
import {
  ContractStatus,
  EmployeeContract,
} from './entities/employee-contract.entity';

/**
 * Kelola kontrak karyawan (reuse BaseTenantService untuk CRUD ter-scope tenant).
 */
@Injectable()
export class ContractService extends BaseTenantService<EmployeeContract> {
  constructor(
    @InjectRepository(EmployeeContract)
    repo: Repository<EmployeeContract>,
  ) {
    super(repo, 'Kontrak');
  }

  /** Buat kontrak baru + komponennya (cascade). */
  create(organizationId: string, dto: CreateContractDto) {
    return super.create(organizationId, {
      ...dto,
      components: dto.components ?? [],
    });
  }

  /** Kontrak ACTIVE milik seorang user (untuk perhitungan gaji). */
  async findActiveByUser(
    organizationId: string,
    userId: string,
  ): Promise<EmployeeContract> {
    const contract = await this.repository.findOne({
      where: {
        organization_id: organizationId,
        user_id: userId,
        status: ContractStatus.ACTIVE,
      },
    });
    if (!contract) {
      throw new NotFoundException('Kontrak aktif karyawan tidak ditemukan');
    }
    return contract;
  }

  /** Semua kontrak seorang user. */
  findByUser(organizationId: string, userId: string) {
    return this.repository.find({
      where: { organization_id: organizationId, user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  /** Semua kontrak ACTIVE di tenant (untuk payroll run massal). */
  findAllActive(organizationId: string) {
    return this.repository.find({
      where: { organization_id: organizationId, status: ContractStatus.ACTIVE },
    });
  }
}

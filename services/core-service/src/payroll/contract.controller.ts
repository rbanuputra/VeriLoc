import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  /** HRD/Admin membuat kontrak karyawan (+ T&C, tunjangan, potongan). */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  create(@TenantId() orgId: string, @Body() dto: CreateContractDto) {
    return this.contractService.create(orgId, dto);
  }

  /** Daftar kontrak tenant (Admin/HRD). */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  findAll(@TenantId() orgId: string, @Query() pagination: PaginationQueryDto) {
    return this.contractService.findAll(orgId, pagination);
  }

  /** Karyawan melihat kontraknya sendiri (T&C, bonus, potongan). */
  @Get('me')
  findMine(@TenantId() orgId: string, @CurrentUser() user: AuthUser) {
    return this.contractService.findByUser(orgId, user.id);
  }

  /** Kontrak seorang user tertentu (Admin/HRD). */
  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  findByUser(@TenantId() orgId: string, @Param('userId') userId: string) {
    return this.contractService.findByUser(orgId, userId);
  }

  /** Detail satu kontrak. */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  findOne(@TenantId() orgId: string, @Param('id') id: string) {
    return this.contractService.findOne(orgId, id);
  }
}

import {
  Body,
  Controller,
  Get,
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
import { PayrollService } from './payroll.service';
import { RunPayrollDto } from './dto/run-payroll.dto';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /** Hitung gaji 1/semua karyawan untuk periode tertentu (Admin/HRD). */
  @Post('run')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  run(@TenantId() orgId: string, @Body() dto: RunPayrollDto) {
    return this.payrollService.run(orgId, dto.period, dto.user_id);
  }

  /** Daftar slip gaji tenant untuk periode ?period=YYYY-MM (Admin/HRD). */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  findByPeriod(
    @TenantId() orgId: string,
    @Query('period') period: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.payrollService.findByPeriod(orgId, period, pagination);
  }

  /** Slip gaji milik sendiri. */
  @Get('me')
  findMine(@TenantId() orgId: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.findMine(orgId, user.id);
  }
}

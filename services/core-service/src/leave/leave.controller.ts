import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { LeaveStatus } from './entities/leave-request.entity';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /** Ajukan cuti/izin/lembur (semua user tenant). */
  @Post()
  request(
    @TenantId() orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.leaveService.request(orgId, user.id, dto);
  }

  /** Riwayat pengajuan sendiri. */
  @Get('me')
  findMine(
    @TenantId() orgId: string,
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.leaveService.findMine(orgId, user.id, pagination);
  }

  /** Semua pengajuan tenant (Admin/HRD), opsional ?status=PENDING. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  findAll(
    @TenantId() orgId: string,
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: LeaveStatus,
  ) {
    return this.leaveService.findForOrg(orgId, pagination, status);
  }

  /** Approve pengajuan (Admin/HRD). */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  approve(
    @TenantId() orgId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.review(
      orgId,
      id,
      user.id,
      LeaveStatus.APPROVED,
      dto.note,
    );
  }

  /** Reject pengajuan (Admin/HRD). */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  reject(
    @TenantId() orgId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.review(
      orgId,
      id,
      user.id,
      LeaveStatus.REJECTED,
      dto.note,
    );
  }
}

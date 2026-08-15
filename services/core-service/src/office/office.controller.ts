import {
  Body,
  Controller,
  Delete,
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
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

/**
 * Manajemen kantor milik tenant yang login. Read: semua user tenant.
 * Create/Update/Delete: Admin/HRD. Semua di-scope ke organizationId.
 */
@Controller('office')
@UseGuards(JwtAuthGuard)
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  create(@TenantId() orgId: string, @Body() dto: CreateOfficeDto) {
    return this.officeService.create(orgId, dto);
  }

  @Get()
  findAll(@TenantId() orgId: string, @Query() pagination: PaginationQueryDto) {
    return this.officeService.findAll(orgId, pagination);
  }

  @Get(':id')
  findOne(@TenantId() orgId: string, @Param('id') id: string) {
    return this.officeService.findOne(orgId, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  update(
    @TenantId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOfficeDto,
  ) {
    return this.officeService.update(orgId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  remove(@TenantId() orgId: string, @Param('id') id: string) {
    return this.officeService.remove(orgId, id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from '../user/user.service';
import { CreateSuperAdminDto } from '../user/dto/create-super-admin.dto';
import { OrganizationService } from './organization.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

/**
 * Manajemen tingkat platform. Hanya SuperAdmin (lintas tenant).
 * Pembuatan organization dilakukan lewat self-service signup
 * (POST /auth/register-organization), bukan di sini.
 */
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SuperAdmin')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userService: UserService,
  ) {}

  @Get()
  findAll() {
    return this.organizationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(id, dto);
  }

  // --- Provisioning SuperAdmin (tim developer) ---

  /** Daftar semua akun SuperAdmin platform. */
  @Get('platform/super-admins')
  listSuperAdmins() {
    return this.userService.findSuperAdmins();
  }

  /** Tambah akun SuperAdmin baru (untuk anggota tim developer). */
  @Post('platform/super-admins')
  createSuperAdmin(@Body() dto: CreateSuperAdminDto) {
    return this.userService.createSuperAdmin(dto);
  }
}

import {
  Body,
  Controller,
  Get,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { AttendanceType } from './entities/attendance.entity';

const selfiePipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: /^image\/(jpeg|png|jpg)$/ })
  .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
  .build({ fileIsRequired: true });

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /** Absen masuk: foto selfie + koordinat GPS. */
  @Post('check-in')
  @UseInterceptors(FileInterceptor('file'))
  checkIn(
    @CurrentUser() user: AuthUser,
    @UploadedFile(selfiePipe) file: Express.Multer.File,
    @Body() dto: CheckInDto,
  ) {
    return this.attendance.record(
      user.organizationId!,
      user.id,
      AttendanceType.CHECK_IN,
      dto,
      file,
    );
  }

  /** Absen pulang: foto selfie + koordinat GPS. */
  @Post('check-out')
  @UseInterceptors(FileInterceptor('file'))
  checkOut(
    @CurrentUser() user: AuthUser,
    @UploadedFile(selfiePipe) file: Express.Multer.File,
    @Body() dto: CheckInDto,
  ) {
    return this.attendance.record(
      user.organizationId!,
      user.id,
      AttendanceType.CHECK_OUT,
      dto,
      file,
    );
  }

  /** Riwayat absensi milik sendiri. */
  @Get('me')
  findMine(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.attendance.findMine(user.organizationId!, user.id, pagination);
  }

  /** Semua absensi dalam tenant — Admin/HRD saja. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'HRD')
  findAll(
    @TenantId() orgId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.attendance.findAll(orgId, pagination);
  }
}

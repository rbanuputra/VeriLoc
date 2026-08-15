import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { OnboardingService } from './onboarding.service';
import { UploadContractDto } from './dto/upload-contract.dto';
import { ConfirmOnboardingDto } from './dto/confirm-onboarding.dto';

// Terima PDF atau gambar kontrak, maks 15 MB.
const contractFilePipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: /(pdf|jpeg|png|jpg)$/ })
  .addMaxSizeValidator({ maxSize: 15 * 1024 * 1024 })
  .build({ fileIsRequired: true });

/**
 * Onboarding karyawan berbasis dokumen (Admin/HRD).
 * upload → review draft → confirm.
 */
@Controller('onboarding/contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'HRD')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /** Upload dokumen kontrak (multipart: file + fullname + email + role_id). */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @TenantId() orgId: string,
    @UploadedFile(contractFilePipe) file: Express.Multer.File,
    @Body() dto: UploadContractDto,
  ) {
    return this.onboarding.upload(orgId, dto, file);
  }

  /** Daftar dokumen kontrak yang diproses. */
  @Get()
  findAll(@TenantId() orgId: string) {
    return this.onboarding.findAll(orgId);
  }

  /** Lihat draft hasil scan (untuk di-review sebelum konfirmasi). */
  @Get(':id')
  findOne(@TenantId() orgId: string, @Param('id') id: string) {
    return this.onboarding.findOne(orgId, id);
  }

  /** Konfirmasi data final → buat akun + kontrak. */
  @Post(':id/confirm')
  confirm(
    @TenantId() orgId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmOnboardingDto,
  ) {
    return this.onboarding.confirm(orgId, id, dto);
  }
}

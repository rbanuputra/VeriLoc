import {
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { BiometricService } from './biometric.service';

// Validasi upload: hanya gambar, maksimal 5 MB.
const imageFilePipe = new ParseFilePipeBuilder()
  .addFileTypeValidator({ fileType: /^image\/(jpeg|png|jpg)$/ })
  .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
  .build({ fileIsRequired: true });

@Controller('biometric')
@UseGuards(JwtAuthGuard)
export class BiometricController {
  constructor(private readonly biometric: BiometricService) {}

  /** Enroll wajah milik user yang sedang login. */
  @Post('enroll')
  @UseInterceptors(FileInterceptor('file'))
  enroll(
    @CurrentUser() user: AuthUser,
    @UploadedFile(imageFilePipe) file: Express.Multer.File,
  ) {
    return this.biometric.enroll(user.organizationId!, user.id, file);
  }

  /** Uji pencocokan wajah terhadap enrollment sendiri (berguna untuk testing). */
  @Post('verify')
  @UseInterceptors(FileInterceptor('file'))
  verify(
    @CurrentUser() user: AuthUser,
    @UploadedFile(imageFilePipe) file: Express.Multer.File,
  ) {
    return this.biometric.match(user.organizationId!, user.id, file);
  }

  /** Daftar enrollment milik user yang sedang login. */
  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.biometric.listByUser(user.organizationId!, user.id);
  }

  /** Nonaktifkan salah satu enrollment milik sendiri. */
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.biometric.deactivate(id, user.organizationId!, user.id);
  }
}

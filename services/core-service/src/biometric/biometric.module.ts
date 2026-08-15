import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { BiometricController } from './biometric.controller';
import { BiometricService } from './biometric.service';
import { FaceEnrollment } from './entities/face-enrollment.entity';

/**
 * Modul biometrik: enroll & pencocokan wajah.
 * Meng-export BiometricService agar bisa dikonsumsi modul lain (Attendance).
 */
@Module({
  imports: [TypeOrmModule.forFeature([FaceEnrollment]), AiModule, StorageModule],
  controllers: [BiometricController],
  providers: [BiometricService],
  exports: [BiometricService],
})
export class BiometricModule {}

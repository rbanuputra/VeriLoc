import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiometricModule } from '../biometric/biometric.module';
import { OfficeModule } from '../office/office.module';
import { StorageModule } from '../storage/storage.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';

/**
 * Modul absensi. Mengorkestrasi:
 *  - BiometricModule → pencocokan wajah
 *  - CompanyModule   → geofence (kantor terdekat + radius)
 *  - StorageModule   → simpan foto bukti
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    BiometricModule,
    OfficeModule,
    StorageModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../attendance/entities/attendance.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollCalculatorService } from './services/payroll-calculator.service';
import { TaxService } from './services/tax.service';
import { BpjsService } from './services/bpjs.service';
import { EmployeeContract } from './entities/employee-contract.entity';
import { ContractComponent } from './entities/contract-component.entity';
import { PayrollRecord } from './entities/payroll-record.entity';

/**
 * Modul penggajian: kontrak karyawan + perhitungan gaji bulanan (terhubung
 * absensi/lembur, BPJS & PPh21 otomatis). Membaca entity Attendance & Leave
 * (read-only) untuk statistik kehadiran.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeContract,
      ContractComponent,
      PayrollRecord,
      Attendance,
      LeaveRequest,
    ]),
  ],
  controllers: [ContractController, PayrollController],
  providers: [
    ContractService,
    PayrollService,
    PayrollCalculatorService,
    TaxService,
    BpjsService,
  ],
  exports: [ContractService, PayrollService],
})
export class PayrollModule {}

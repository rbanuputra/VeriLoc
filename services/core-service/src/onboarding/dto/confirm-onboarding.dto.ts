import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContractComponentDto } from '../../payroll/dto/create-contract.dto';
import { PtkpStatus } from '../../payroll/entities/employee-contract.entity';

/**
 * Data FINAL yang dikonfirmasi HRD (setelah mengoreksi hasil scan).
 * Dari sini dibuat akun karyawan + kontrak.
 */
export class ConfirmOnboardingDto {
  // Data akun (boleh beda dari upload bila dikoreksi)
  @IsString()
  fullname!: string;

  @IsEmail()
  email!: string;

  @IsUUID()
  role_id!: string;

  // Data kontrak
  @IsNumber()
  @Min(0)
  base_salary!: number;

  @IsDateString()
  start_date!: string;

  @IsOptional()
  @IsEnum(PtkpStatus)
  ptkp_status?: PtkpStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime_rate_per_hour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  standard_working_days?: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractComponentDto)
  components?: ContractComponentDto[];
}

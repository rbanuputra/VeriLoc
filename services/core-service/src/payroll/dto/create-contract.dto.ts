import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ComponentCalc,
  ComponentKind,
} from '../entities/contract-component.entity';
import {
  ContractType,
  PtkpStatus,
} from '../entities/employee-contract.entity';

export class ContractComponentDto {
  @IsEnum(ComponentKind)
  kind!: ComponentKind;

  @IsString()
  name!: string;

  @IsEnum(ComponentCalc)
  calc!: ComponentCalc;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;
}

export class CreateContractDto {
  @IsUUID()
  user_id!: string;

  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;

  @IsNumber()
  @Min(0)
  base_salary!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  standard_working_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime_rate_per_hour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  absence_deduction_per_day?: number;

  @IsOptional()
  @IsEnum(PtkpStatus)
  ptkp_status?: PtkpStatus;

  @IsOptional()
  @IsBoolean()
  bpjs_kesehatan?: boolean;

  @IsOptional()
  @IsBoolean()
  bpjs_jht?: boolean;

  @IsOptional()
  @IsBoolean()
  bpjs_jp?: boolean;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsDateString()
  start_date!: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractComponentDto)
  components?: ContractComponentDto[];
}

import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { LeaveType } from '../entities/leave-request.entity';

export class CreateLeaveDto {
  @IsEnum(LeaveType)
  type!: LeaveType;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsString()
  @MinLength(3)
  reason!: string;

  /** Total jam lembur (wajib diisi bila type = LEMBUR). */
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(24)
  hours?: number;
}

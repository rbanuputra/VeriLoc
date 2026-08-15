import { IsOptional, IsString } from 'class-validator';

/** Payload approve/reject pengajuan (catatan opsional dari approver). */
export class ReviewLeaveDto {
  @IsOptional()
  @IsString()
  note?: string;
}

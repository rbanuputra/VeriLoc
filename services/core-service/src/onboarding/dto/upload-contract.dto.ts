import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/** Info dasar karyawan yang diisi HRD saat upload dokumen (bersama file). */
export class UploadContractDto {
  @IsString()
  @IsNotEmpty()
  fullname!: string;

  @IsEmail()
  email!: string;

  @IsUUID()
  role_id!: string;
}

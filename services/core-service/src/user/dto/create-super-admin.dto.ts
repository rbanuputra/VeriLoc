import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';

/** Provisioning akun SuperAdmin platform (tim developer). */
export class CreateSuperAdminDto {
  @IsString()
  @IsNotEmpty()
  fullname!: string;

  @IsEmail()
  email!: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;
}

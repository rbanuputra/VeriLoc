import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * Self-service signup tenant: sekali submit membuat Organization + user Admin
 * pertamanya.
 */
export class RegisterOrganizationDto {
  @IsString()
  @MinLength(2)
  org_name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'org_slug hanya boleh huruf kecil, angka, dan tanda hubung',
  })
  org_slug?: string;

  @IsString()
  @IsNotEmpty()
  admin_fullname!: string;

  @IsEmail()
  admin_email!: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  admin_password!: string;
}

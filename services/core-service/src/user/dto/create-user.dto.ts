import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsStrongPassword, IsUUID } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    fullname!: string;

    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    password!: string;

    @IsUUID()
    role_id!: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

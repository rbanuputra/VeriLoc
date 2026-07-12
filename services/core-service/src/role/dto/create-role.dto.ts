import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    name!:string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}

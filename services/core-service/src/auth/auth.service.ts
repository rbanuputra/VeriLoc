import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwt: JwtService
    ){}

    async login(LoginDto: LoginDto){
        const user = await this.userService.findByEmail(LoginDto.email)
        if (!user || !(await bcrypt.compare(LoginDto.password,user.password_hash))){
            throw new  UnauthorizedException("Wrong Email or Password")
        }
        const payload ={
            sub:user.id,
            email:user.email,
            role:user.role.name
        }
        return {
            access_token: await this.jwt.signAsync(payload)
        }
    }

    async register(RegisterDto: CreateUserDto){
        const newUser = await this.userService.create(RegisterDto)
        const dataUser = await this.userService.findOne(newUser.id)
        const payload = {
            sub: dataUser.id,
            email:dataUser.email,
            role:dataUser.role.name
        }
        return {
            user : {
                id: dataUser.id,
                email:dataUser.email,
                role:dataUser.role.name
            },
            access_token: await this.jwt.signAsync(payload)
        }
    }
}

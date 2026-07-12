import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const passwordHash = await bcrypt.hash(createUserDto.password, 10);
      const user = this.userRepository.create({
        fullname: createUserDto.fullname,
        email: createUserDto.email,
        password_hash: passwordHash,
        role: { id: createUserDto.role_id },
        is_active: createUserDto.is_active ?? true,
      });
      return await this.userRepository.save(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw error;
    }
  }

  findAll() {
    return this.userRepository.find({ 
      where: { 
        is_active: true 
      }, 
      relations: {
        role: true 
      } 
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { 
        id: id, 
        is_active: true 
      },
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} tidak ditemukan`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id)
    if (updateUserDto.fullname !== undefined) {
      user.fullname = updateUserDto.fullname;
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.password !== undefined) {
      const passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      user.password_hash = passwordHash;
    }
    if (updateUserDto.role_id !== undefined) {
      user.role = { id: updateUserDto.role_id } as any;
    }
    return this.userRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id)
    user.is_active = false;
    return this.userRepository.save(user);
  }

  findByEmail(email:string) {
    return this.userRepository.findOne({
      where: { 
        email, 
        is_active: true
      },
      relations: { role:true },
      select: {
        id: true,
        email: true,
        fullname: true,
        password_hash: true,
        role: {
          id: true,
          name: true
        }
      }
    })
  }
}

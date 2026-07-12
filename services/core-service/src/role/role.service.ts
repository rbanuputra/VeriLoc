import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>
  ){}

  async create(createRoleDto: CreateRoleDto) {
    try {
      const role = this.roleRepository.create({
        name: createRoleDto.name,
        is_active: createRoleDto.is_active ?? true,
      })
      return await this.roleRepository.save(role)
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Nama role sudah ada')
      }
      throw error
    }
  }

  findAll() {
    return this.roleRepository.find({ where: { is_active: true } });
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id: id, is_active: true },
    })
    if (!role){
      throw new NotFoundException(`Role ${id} tidak ditemukan`)
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id)
    if (updateRoleDto.name !== undefined) {
      role.name = updateRoleDto.name;
    } 
    return this.roleRepository.save(role)
  }

  async remove(id: string) {
    const role = await this.findOne(id)
    role.is_active = false
    return this.roleRepository.save(role)
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin','HRD')
  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin','HRD')
  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin','HRD')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin','HRD')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin','HRD')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}

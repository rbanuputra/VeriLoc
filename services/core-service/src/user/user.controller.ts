import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { TenantId } from 'src/common/decorators/tenant-id.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import type { AuthUser } from 'src/auth/interfaces/auth-user.interface';

// Semua endpoint di-scope ke tenant admin yang login (organizationId).
@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'HRD')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto, actor.organizationId!);
  }

  @Get()
  findAll(@TenantId() orgId: string, @Query() pagination: PaginationQueryDto) {
    return this.userService.findAll(orgId, pagination);
  }

  @Get(':id')
  findOne(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id, actor.organizationId!);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto, actor.organizationId!);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.userService.remove(id, actor.organizationId!);
  }
}

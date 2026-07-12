import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../role/entities/role.entity';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async run() {
    const roles = await this.seedRoles();
    await this.seedAdmin(roles.admin);
  }

  /** Bikin role user/admin/hrd kalau belum ada. Idempotent. */
  private async seedRoles(): Promise<Record<string, Role>> {
    const names = ['User', 'Admin', 'HRD'];
    const map: Record<string, Role> = {};

    for (const name of names) {
      let role = await this.roleRepo.findOne({ where: { name } });
      if (!role) {
        role = await this.roleRepo.save(this.roleRepo.create({ name }));
        this.logger.log(`Role dibuat: ${name}`);
      } else {
        this.logger.log(`Role sudah ada, dilewati: ${name}`);
      }
      map[name] = role;
    }
    return map;
  }

  /** Bikin 1 user Admin awal kalau belum ada. Idempotent. */
  private async seedAdmin(adminRole: Role) {
    const email = this.config.get<string>('ADMIN_EMAIL', 'admin@geoface.com');

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      this.logger.log(`Admin sudah ada, dilewati: ${email}`);
      return;
    }

    const password = this.config.get<string>('ADMIN_PASSWORD', 'Password123!');
    const password_hash = await bcrypt.hash(password, 10);

    await this.userRepo.save(
      this.userRepo.create({
        fullname: 'Administrator',
        email,
        password_hash,
        role: adminRole,
        is_active: true,
      }),
    );
    this.logger.log(`Admin dibuat: ${email} (password: ${password})`);
  }
}
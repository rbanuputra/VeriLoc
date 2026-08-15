import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  /** Buat tenant. Bisa dipakai dalam transaksi (lewat manager opsional). */
  async create(
    dto: CreateOrganizationDto,
    manager?: Repository<Organization>,
  ): Promise<Organization> {
    const repo = manager ?? this.repo;
    const slug = dto.slug ?? this.slugify(dto.name);

    if (await repo.findOne({ where: { slug } })) {
      throw new ConflictException(`slug "${slug}" sudah dipakai`);
    }
    return repo.save(repo.create({ name: dto.name, slug }));
  }

  findAll() {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string) {
    const org = await this.repo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization tidak ditemukan');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.findOne(id);
    Object.assign(org, dto);
    return this.repo.save(org);
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

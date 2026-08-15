import { NotFoundException } from '@nestjs/common';
import {
  DeepPartial,
  FindManyOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { paginate, PaginatedResult } from '../dto/paginated-result';

/**
 * Service dasar untuk resource milik tenant. Semua operasi OTOMATIS di-scope
 * ke organization_id, jadi turunannya tidak perlu menulis ulang filter tenant.
 *
 * Pemakaian:
 *   @Injectable()
 *   export class LeaveService extends BaseTenantService<LeaveRequest> {
 *     constructor(@InjectRepository(LeaveRequest) repo: Repository<LeaveRequest>) {
 *       super(repo, 'Pengajuan');
 *     }
 *   }
 */
export abstract class BaseTenantService<
  T extends ObjectLiteral & { id: string; organization_id: string },
> {
  protected constructor(
    protected readonly repository: Repository<T>,
    /** Nama entitas untuk pesan error, mis. "Kantor", "Pengajuan". */
    protected readonly entityLabel: string = 'Data',
  ) {}

  create(organizationId: string, data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create({
      ...data,
      organization_id: organizationId,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  async findAll(
    organizationId: string,
    pagination?: PaginationQueryDto,
    options?: FindManyOptions<T>,
  ): Promise<PaginatedResult<T>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    const [data, total] = await this.repository.findAndCount({
      order: { created_at: 'DESC' } as unknown as FindManyOptions<T>['order'],
      ...options,
      where: {
        ...(options?.where as object),
        organization_id: organizationId,
      } as FindOptionsWhere<T>,
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginate(data, total, page, limit);
  }

  async findOne(
    organizationId: string,
    id: string,
    options?: Omit<FindManyOptions<T>, 'where'>,
  ): Promise<T> {
    const entity = await this.repository.findOne({
      ...options,
      where: { id, organization_id: organizationId } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(`${this.entityLabel} tidak ditemukan`);
    }
    return entity;
  }

  async update(
    organizationId: string,
    id: string,
    data: DeepPartial<T>,
  ): Promise<T> {
    const entity = await this.findOne(organizationId, id);
    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async remove(organizationId: string, id: string): Promise<{ deleted: true }> {
    const entity = await this.findOne(organizationId, id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}

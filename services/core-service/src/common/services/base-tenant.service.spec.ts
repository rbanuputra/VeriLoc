import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseTenantService } from './base-tenant.service';

interface Dummy {
  id: string;
  organization_id: string;
  name?: string;
}

class DummyService extends BaseTenantService<Dummy> {
  constructor(repo: Repository<Dummy>) {
    super(repo, 'Dummy');
  }
}

describe('BaseTenantService', () => {
  let repo: jest.Mocked<Partial<Repository<Dummy>>>;
  let service: DummyService;

  beforeEach(() => {
    repo = {
      create: jest.fn((d) => d as Dummy),
      save: jest.fn(async (d) => d as Dummy),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };
    service = new DummyService(repo as unknown as Repository<Dummy>);
  });

  it('create menyisipkan organization_id dari argumen (scoping otomatis)', async () => {
    await service.create('org-1', { name: 'A' });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-1', name: 'A' }),
    );
  });

  it('findOne memfilter berdasarkan id + organization_id', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({
      id: 'x',
      organization_id: 'org-1',
    });
    await service.findOne('org-1', 'x');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'x', organization_id: 'org-1' },
    });
  });

  it('findOne melempar NotFound bila data tidak ada di tenant', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.findOne('org-1', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

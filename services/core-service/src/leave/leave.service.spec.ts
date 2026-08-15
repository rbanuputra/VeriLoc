import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { LeaveService } from './leave.service';
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from './entities/leave-request.entity';

describe('LeaveService', () => {
  let repo: jest.Mocked<Partial<Repository<LeaveRequest>>>;
  let service: LeaveService;

  beforeEach(() => {
    repo = {
      create: jest.fn((d) => d as LeaveRequest),
      save: jest.fn(async (d) => d as LeaveRequest),
      findOne: jest.fn(),
    };
    service = new LeaveService(repo as unknown as Repository<LeaveRequest>);
  });

  it('request menolak tanggal selesai sebelum tanggal mulai', async () => {
    await expect(
      service.request('org-1', 'user-1', {
        type: LeaveType.CUTI,
        start_date: '2026-08-05',
        end_date: '2026-08-01',
        reason: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approve mengubah status PENDING menjadi APPROVED + mencatat reviewer', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({
      id: 'l1',
      organization_id: 'org-1',
      status: LeaveStatus.PENDING,
    } as LeaveRequest);

    const result = await service.review(
      'org-1',
      'l1',
      'admin-1',
      LeaveStatus.APPROVED,
      'ok',
    );

    expect(result.status).toBe(LeaveStatus.APPROVED);
    expect(result.reviewed_by).toBe('admin-1');
    expect(result.review_note).toBe('ok');
  });

  it('review menolak pengajuan yang sudah diproses', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({
      id: 'l1',
      organization_id: 'org-1',
      status: LeaveStatus.APPROVED,
    } as LeaveRequest);

    await expect(
      service.review('org-1', 'l1', 'admin-1', LeaveStatus.REJECTED),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

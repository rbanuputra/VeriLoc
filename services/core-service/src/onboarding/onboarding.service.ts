import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { UserService } from '../user/user.service';
import { ContractService } from '../payroll/contract.service';
import { ContractParserService } from './contract-parser.service';
import { UploadContractDto } from './dto/upload-contract.dto';
import { ConfirmOnboardingDto } from './dto/confirm-onboarding.dto';
import {
  ContractDocument,
  DocumentStatus,
} from './entities/contract-document.entity';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

/**
 * Alur onboarding karyawan berbasis dokumen:
 *   upload kontrak → OCR + parse (draft) → HRD review/koreksi →
 *   confirm → buat akun karyawan (password sementara) + kontrak → link dokumen.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(ContractDocument)
    private readonly docRepo: Repository<ContractDocument>,
    private readonly ai: AiService,
    private readonly storage: StorageService,
    private readonly users: UserService,
    private readonly contracts: ContractService,
    private readonly parser: ContractParserService,
  ) {}

  /** Upload dokumen kontrak → OCR → parse → simpan draft (status SCANNED). */
  async upload(
    organizationId: string,
    dto: UploadContractDto,
    file: UploadedFile,
  ): Promise<ContractDocument> {
    const ext = file.originalname.split('.').pop() ?? 'pdf';
    const key = `contracts/${organizationId}/${randomUUID()}.${ext}`;
    await this.storage.putObject(key, file.buffer, file.mimetype);

    const text = await this.ai.ocr(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    const draft = this.parser.parse(text);

    const doc = await this.docRepo.save(
      this.docRepo.create({
        organization_id: organizationId,
        file_key: key,
        original_name: file.originalname,
        status: DocumentStatus.SCANNED,
        raw_text: text.slice(0, 20_000),
        extracted_data: { ...draft, employee: dto },
      }),
    );
    this.logger.log(
      `Dokumen kontrak di-scan: ${doc.id} (base_salary=${draft.base_salary ?? '?'})`,
    );
    return doc;
  }

  findOne(organizationId: string, id: string) {
    return this.docRepo.findOneOrFail({
      where: { id, organization_id: organizationId },
    });
  }

  findAll(organizationId: string) {
    return this.docRepo.find({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Konfirmasi HRD: buat akun karyawan (password sementara) + kontrak dari data
   * final, lalu link ke dokumen. Mengembalikan password sementara sekali ini.
   */
  async confirm(
    organizationId: string,
    id: string,
    dto: ConfirmOnboardingDto,
  ) {
    const doc = await this.findOne(organizationId, id);
    if (doc.status === DocumentStatus.CONFIRMED) {
      throw new BadRequestException('Dokumen sudah dikonfirmasi');
    }

    const { user, tempPassword } = await this.users.createEmployee(
      organizationId,
      { fullname: dto.fullname, email: dto.email, role_id: dto.role_id },
    );

    const contract = await this.contracts.create(organizationId, {
      user_id: user.id,
      base_salary: dto.base_salary,
      start_date: dto.start_date,
      ptkp_status: dto.ptkp_status,
      overtime_rate_per_hour: dto.overtime_rate_per_hour,
      standard_working_days: dto.standard_working_days,
      terms: dto.terms,
      components: dto.components,
    });

    doc.user_id = user.id;
    doc.contract_id = contract.id;
    doc.status = DocumentStatus.CONFIRMED;
    await this.docRepo.save(doc);

    return {
      message: 'Akun karyawan & kontrak berhasil dibuat',
      temp_password: tempPassword,
      user: { id: user.id, email: user.email, fullname: user.fullname },
      contract_id: contract.id,
      document_id: doc.id,
    };
  }
}

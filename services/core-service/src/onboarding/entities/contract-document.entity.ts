import { Column, Entity } from 'typeorm';
import { BaseTenantEntity } from '../../common/entities/base-tenant.entity';
import { ParsedContract } from '../contract-parser.service';

export enum DocumentStatus {
  SCANNED = 'SCANNED', // sudah OCR + parse, menunggu konfirmasi HRD
  CONFIRMED = 'CONFIRMED', // sudah jadi akun + kontrak
}

/**
 * Dokumen kontrak yang di-upload HRD. Menyimpan file asli (MinIO), teks hasil
 * OCR, dan draft data terstruktur untuk di-review. Setelah dikonfirmasi,
 * ter-link ke user & kontrak yang dibuat.
 */
@Entity('contract_documents')
export class ContractDocument extends BaseTenantEntity {
  @Column()
  file_key!: string; // objek di MinIO

  @Column()
  original_name!: string;

  @Column({ type: 'varchar', default: DocumentStatus.SCANNED })
  status!: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  raw_text!: string | null; // teks mentah OCR

  /** Draft hasil parsing + info karyawan yang diisi HRD saat upload. */
  @Column({ type: 'jsonb' })
  extracted_data!: ParsedContract & {
    employee: { fullname: string; email: string; role_id: string };
  };

  @Column('uuid', { nullable: true })
  user_id!: string | null; // terisi setelah confirm

  @Column('uuid', { nullable: true })
  contract_id!: string | null; // terisi setelah confirm
}

import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base entity untuk semua tabel milik tenant.
 * Turunkan (extends) supaya tiap entity otomatis punya:
 *  - id (uuid)
 *  - organization_id (kolom scoping tenant, ter-index)
 *  - created_at / updated_at
 *
 * Pemakaian:
 *   @Entity('leaves')
 *   export class LeaveRequest extends BaseTenantEntity { ... }
 */
export abstract class BaseTenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  organization_id!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

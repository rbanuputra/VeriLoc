import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tenant SaaS = satu perusahaan pelanggan. Semua data tenant (user, office,
 * enrollment, absensi) di-scope lewat organization_id → terisolasi antar tenant.
 */
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  // Identifier unik ramah-URL (mis. "acme-corp"). Berguna untuk subdomain nanti.
  @Column({ unique: true })
  slug!: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

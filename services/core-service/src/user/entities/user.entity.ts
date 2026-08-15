import { Organization } from "src/organization/entities/organization.entity";
import { Role } from "src/role/entities/role.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    fullname!: string;

    @Column({unique: true})
    email!: string;

    @Column({select: false})
    password_hash!: string;

    @ManyToOne(() => Role, role => role.users)
    role!: Role;

    // Tenant pemilik user. NULL hanya untuk SuperAdmin (level platform).
    @Column('uuid', { nullable: true })
    organization_id!: string | null;

    @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization?: Organization;

    @Column({default: true})
    is_active!: boolean;

    // true = akun baru (hasil onboarding) yang wajib ganti password saat login pertama.
    @Column({default: false})
    must_change_password!: boolean;
}

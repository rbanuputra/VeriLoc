import { Role } from "src/role/entities/role.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

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

    @Column({default: true})
    is_active!: boolean;
}

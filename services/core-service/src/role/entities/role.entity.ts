import { User } from "src/user/entities/user.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({unique: true})
    name!: string;

    @OneToMany(() => User, user => user.role)
    users!: User[];

    @Column({default: true})
    is_active!: boolean;
}

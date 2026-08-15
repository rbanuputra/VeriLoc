import { Office } from 'src/office/entities/office.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

/**
 * Log absensi. Satu baris = satu kejadian check-in / check-out yang BERHASIL
 * (lolos verifikasi wajah + geofence). Menyimpan bukti: foto, koordinat,
 * jarak ke kantor, dan skor kecocokan wajah.
 */
@Entity('attendances')
@Index(['organization_id', 'created_at'])
@Index(['user_id', 'created_at'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  organization_id!: string;

  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('uuid', { nullable: true })
  office_id!: string | null;

  @ManyToOne(() => Office, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'office_id' })
  office!: Office;

  @Column({ type: 'varchar' })
  type!: AttendanceType;

  // Foto bukti absensi di MinIO (bucket biometric, prefix attendance/).
  @Column()
  photo_key!: string;

  @Column('decimal', { precision: 10, scale: 7 })
  latitude!: number;

  @Column('decimal', { precision: 10, scale: 7 })
  longitude!: number;

  // Jarak user ke kantor saat absen (meter) — hasil ST_DistanceSphere.
  @Column('float')
  distance_meters!: number;

  // Cosine distance kecocokan wajah (semakin kecil semakin mirip).
  @Column('float')
  face_distance!: number;

  // Skor liveness/anti-spoofing (0..1). null jika liveness dimatikan.
  @Column('float', { nullable: true })
  liveness_score!: number | null;

  @CreateDateColumn()
  created_at!: Date;
}

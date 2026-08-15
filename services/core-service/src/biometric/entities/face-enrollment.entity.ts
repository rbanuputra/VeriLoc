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

/**
 * Menyimpan hasil enrollment wajah seorang user.
 * - `embedding`: vektor Facenet (128 dim) di kolom pgvector → dipakai untuk
 *   pencocokan jarak (cosine) saat absensi.
 * - `image_key`: referensi foto bukti di MinIO (bukan foto-nya sendiri).
 *
 * Satu user boleh punya beberapa sampel (angle berbeda) untuk akurasi.
 */
@Entity('face_enrollments')
export class FaceEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  organization_id!: string;

  @Index()
  @Column('uuid')
  user_id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // pgvector; Facenet menghasilkan embedding 128 dimensi.
  @Column({ type: 'vector', length: 128, select: false })
  embedding!: number[];

  // Object key foto bukti di MinIO (bucket biometric).
  @Column()
  image_key!: string;

  @Column({ default: 'Facenet' })
  model!: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}

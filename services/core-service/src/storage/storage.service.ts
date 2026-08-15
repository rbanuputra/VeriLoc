import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';

/**
 * Wrapper tipis di atas MinIO (S3 compatible) untuk menyimpan objek biner
 * seperti foto biometrik. Semua konfigurasi dibaca dari environment variable
 * (tidak ada credential hardcoded).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'biometric');
    this.client = new MinioClient({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'minio'),
      port: Number(this.config.get<string>('MINIO_PORT', '9000')),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  /** Pastikan bucket target tersedia saat service start. */
  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" dibuat.`);
      }
    } catch (err) {
      this.logger.error(`Gagal inisialisasi bucket MinIO: ${String(err)}`);
      throw new InternalServerErrorException('Storage tidak tersedia');
    }
  }

  /**
   * Upload buffer ke MinIO.
   * @returns object key yang tersimpan.
   */
  async putObject(
    key: string,
    buffer: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    try {
      await this.client.putObject(this.bucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
      });
      return key;
    } catch (err) {
      this.logger.error(`Gagal upload "${key}": ${String(err)}`);
      throw new InternalServerErrorException('Gagal menyimpan objek');
    }
  }

  /** Buat presigned URL untuk baca objek (default berlaku 1 jam). */
  presignedGetUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  /** Hapus objek (mis. saat enrollment dibatalkan). */
  async removeObject(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (err) {
      this.logger.warn(`Gagal hapus "${key}": ${String(err)}`);
    }
  }
}

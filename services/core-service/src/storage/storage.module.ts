import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Modul infrastruktur storage (MinIO). Global-agnostic: cukup di-import
 * oleh modul yang butuh (mis. BiometricModule).
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

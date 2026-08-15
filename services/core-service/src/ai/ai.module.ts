import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';

/**
 * Modul infrastruktur untuk berkomunikasi dengan ai-service.
 * timeout 30s karena inferensi DeepFace bisa lambat pada request pertama.
 */
@Module({
  imports: [HttpModule.register({ timeout: 30_000, maxRedirects: 0 })],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

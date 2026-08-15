import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Abstraksi pengiriman email. Implementasi dev hanya mencetak ke log
 * (belum kirim email sungguhan). Untuk produksi, ganti body method ini
 * dengan nodemailer/SES/SendGrid — antarmuka tetap sama, pemanggil tak berubah.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3001');
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const link = `${this.appUrl}/reset-password?token=${rawToken}`;
    // TODO(prod): kirim via SMTP/provider. Sekarang: log (dev only).
    this.logger.log(`[DEV] Reset password untuk ${email}: ${link}`);
  }
}

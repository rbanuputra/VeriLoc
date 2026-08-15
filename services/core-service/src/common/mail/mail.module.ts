import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Global agar MailService bisa di-inject di mana saja tanpa import berulang. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

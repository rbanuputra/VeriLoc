import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SeederModule } from './seeder.module';
import { SeederService } from './seeder.service';

// Entry point seeder. Jalanin: npm run seed
async function bootstrap() {
  const logger = new Logger('Seeder');
  // createApplicationContext = boot DI container TANPA server HTTP.
  const app = await NestFactory.createApplicationContext(SeederModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    await app.get(SeederService).run();
    logger.log('Seeding selesai ✅');
  } catch (err) {
    logger.error('Seeding gagal ❌', err as Error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
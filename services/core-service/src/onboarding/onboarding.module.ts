import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';
import { PayrollModule } from '../payroll/payroll.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { ContractParserService } from './contract-parser.service';
import { ContractDocument } from './entities/contract-document.entity';

/**
 * Onboarding karyawan berbasis dokumen. Mengorkestrasi OCR (ai), storage,
 * pembuatan user, dan pembuatan kontrak (payroll).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ContractDocument]),
    AiModule,
    StorageModule,
    UserModule,
    PayrollModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, ContractParserService],
})
export class OnboardingModule {}

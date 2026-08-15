import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { BiometricModule } from './biometric/biometric.module';
import { OfficeModule } from './office/office.module';
import { AttendanceModule } from './attendance/attendance.module';
import { OrganizationModule } from './organization/organization.module';
import { LeaveModule } from './leave/leave.module';
import { PayrollModule } from './payroll/payroll.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './common/mail/mail.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { envValidationSchema } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres',
        url: c.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // DEV: boleh true; PROD: false + pakai migration (npm run migration:run).
        synchronize: c.get<boolean>('DB_SYNCHRONIZE') ?? false,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        throttlers: [
          {
            ttl: (c.get<number>('THROTTLE_TTL') ?? 60) * 1000,
            limit: c.get<number>('THROTTLE_LIMIT') ?? 100,
          },
        ],
      }),
    }),
    HealthModule,
    MailModule,
    OrganizationModule, UserModule, RoleModule, AuthModule, BiometricModule, OfficeModule, AttendanceModule, LeaveModule, PayrollModule, OnboardingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}

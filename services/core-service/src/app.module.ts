import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres',
        url: c.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UserModule, RoleModule, AuthModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

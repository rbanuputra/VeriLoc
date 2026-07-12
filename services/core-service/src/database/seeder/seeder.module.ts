import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../role/entities/role.entity';
import { User } from '../../user/entities/user.entity';
import { SeederService } from './seeder.service';

// Module mandiri buat seeder — punya koneksi DB sendiri (dipanggil di luar
// konteks HTTP lewat NestFactory.createApplicationContext).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres',
        url: c.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // DEV: pastikan tabel ada sebelum seeding
      }),
    }),
    TypeOrmModule.forFeature([Role, User]),
  ],
  providers: [SeederService],
})
export class SeederModule {}
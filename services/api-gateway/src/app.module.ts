import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CoreController } from './core.controller';
import { AiController } from './ai.controller';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    HttpModule,
  ],
  controllers: [AppController,CoreController,AiController],
  providers: [AppService],
})
export class AppModule {}

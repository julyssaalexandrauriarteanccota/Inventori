import { Module } from '@nestjs/common';
import { AdminConfigController } from './config.controller';
import { ConfigService } from './config.service';

@Module({
  controllers: [AdminConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AdminConfigModule {}

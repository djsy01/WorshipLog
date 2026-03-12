import { Module } from '@nestjs/common';
import { ContisController } from './contis.controller';
import { ContisService } from './contis.service';

@Module({
  controllers: [ContisController],
  providers: [ContisService],
})
export class ContisModule {}

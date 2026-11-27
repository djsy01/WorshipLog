import { Module } from '@nestjs/common';
import { ContisController } from './contis.controller';
import { ContisService } from './contis.service';
import { ContiSheetController } from './conti-sheet.controller';
import { ContiSheetService } from './conti-sheet.service';

@Module({
  controllers: [ContisController, ContiSheetController],
  providers: [ContisService, ContiSheetService],
})
export class ContisModule {}

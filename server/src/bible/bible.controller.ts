import { Controller, Get, UseGuards } from '@nestjs/common';
import { BibleService } from './bible.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bible')
export class BibleController {
  constructor(private bibleService: BibleService) {}

  @Get('random')
  getRandom() {
    return this.bibleService.getRandomVerse();
  }

  @Get('today')
  getToday() {
    return this.bibleService.getVerseOfDay();
  }
}

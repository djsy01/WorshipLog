import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { BibleService } from './bible.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('bible')
export class BibleController {
  constructor(private bibleService: BibleService) {}

  @Get('random')
  getRandom() {
    return this.bibleService.getRandomVerse();
  }

  @Get('today')
  getToday(@CurrentUser('sub') userId: string) {
    return this.bibleService.getVerseOfDay(userId);
  }

  @Get('meditations')
  getMeditations(@CurrentUser('sub') userId: string) {
    return this.bibleService.getMeditations(userId);
  }

  @Patch('meditations/:id')
  updateNote(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: { note: string },
  ) {
    return this.bibleService.updateNote(userId, id, dto.note);
  }

  @Get('search')
  searchByRef(@Query('ref') ref: string) {
    if (!ref) return [];
    return this.bibleService.searchByRef(ref);
  }
}

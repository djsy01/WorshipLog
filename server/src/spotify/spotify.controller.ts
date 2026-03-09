import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('spotify')
@UseGuards(JwtAuthGuard)
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('search')
  search(@Query('q') q: string) {
    if (!q?.trim()) return [];
    return this.spotifyService.search(q.trim());
  }
}

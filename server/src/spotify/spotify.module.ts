import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';

@Module({
  controllers: [SpotifyController],
  providers: [SpotifyService],
})
export class SpotifyModule {}

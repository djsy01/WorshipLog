import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { SheetMusicController } from './sheet-music.controller';
import { SheetMusicService } from './sheet-music.service';

@Module({
  controllers: [SongsController, SheetMusicController],
  providers: [SongsService, SheetMusicService],
})
export class SongsModule {}

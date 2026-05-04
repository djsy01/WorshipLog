import { Module } from '@nestjs/common';
import { ContisController } from './contis.controller';
import { ContisService } from './contis.service';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [SongsModule],
  controllers: [ContisController],
  providers: [ContisService],
})
export class ContisModule {}

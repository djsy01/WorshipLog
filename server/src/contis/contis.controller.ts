import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ContisService } from './contis.service';
import { CreateContiDto } from './dto/create-conti.dto';
import { UpdateContiDto } from './dto/update-conti.dto';
import { AddSongDto } from './dto/add-song.dto';
import { UpdateContiSongDto } from './dto/update-conti-song.dto';
import { ReorderSongsDto } from './dto/reorder-songs.dto';
import { ShareContiDto } from './dto/share-conti.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('contis')
export class ContisController {
  constructor(private contisService: ContisService) {}

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateContiDto) {
    return this.contisService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('sub') userId: string) {
    return this.contisService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.contisService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContiDto,
  ) {
    return this.contisService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.contisService.remove(userId, id);
  }

  @Post(':id/songs')
  addSong(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Body() dto: AddSongDto,
  ) {
    return this.contisService.addSong(userId, contiId, dto);
  }

  @Patch(':id/songs/:songId')
  updateSong(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Param('songId') contiSongId: string,
    @Body() dto: UpdateContiSongDto,
  ) {
    return this.contisService.updateSong(userId, contiId, contiSongId, dto);
  }

  @Delete(':id/songs/:songId')
  removeSong(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Param('songId') contiSongId: string,
  ) {
    return this.contisService.removeSong(userId, contiId, contiSongId);
  }

  @Put(':id/songs/reorder')
  reorderSongs(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Body() dto: ReorderSongsDto,
  ) {
    return this.contisService.reorderSongs(userId, contiId, dto.ids);
  }

  @Post(':id/share')
  shareWithTeam(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Body() dto: ShareContiDto,
  ) {
    return this.contisService.shareWithTeam(userId, contiId, dto.teamId);
  }

  @Delete(':id/share')
  unshare(@CurrentUser('sub') userId: string, @Param('id') contiId: string) {
    return this.contisService.unshare(userId, contiId);
  }
}

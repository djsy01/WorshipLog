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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContisService } from './contis.service';
import { CreateContiDto } from './dto/create-conti.dto';
import { UpdateContiDto } from './dto/update-conti.dto';
import { AddSongDto } from './dto/add-song.dto';
import { UpdateContiSongDto } from './dto/update-conti-song.dto';
import { ReorderSongsDto } from './dto/reorder-songs.dto';
import { ShareContiDto } from './dto/share-conti.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SheetMusicService } from '../songs/sheet-music.service';

@UseGuards(JwtAuthGuard)
@Controller('contis')
export class ContisController {
  constructor(
    private contisService: ContisService,
    private sheetMusicService: SheetMusicService,
  ) {}

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
  shareWithRoom(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Body() dto: ShareContiDto,
  ) {
    return this.contisService.shareWithRoom(userId, contiId, dto.roomId);
  }

  @Delete(':id/share')
  unshare(@CurrentUser('sub') userId: string, @Param('id') contiId: string) {
    return this.contisService.unshare(userId, contiId);
  }

  @Post(':id/songs/:contiSongId/sheet')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('PDF 또는 이미지 파일만 업로드 가능합니다.'), false);
        }
      },
    }),
  )
  uploadContiSheet(
    @CurrentUser('sub') userId: string,
    @Param('contiSongId') contiSongId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('파일이 없습니다.');
    return this.sheetMusicService.uploadForContiSong(userId, contiSongId, file);
  }

  @Delete(':id/songs/:contiSongId/sheet/:sheetId')
  deleteContiSheet(
    @CurrentUser('sub') userId: string,
    @Param('sheetId') sheetId: string,
  ) {
    return this.sheetMusicService.removeSheet(userId, sheetId);
  }
}

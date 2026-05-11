import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetMusicService } from './sheet-music.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('songs')
export class SheetMusicController {
  constructor(private sheetMusicService: SheetMusicService) {}

  @Post(':id/sheet')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
  uploadSheet(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') songId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (userRole !== 'admin') throw new ForbiddenException('관리자만 악보를 업로드할 수 있습니다.');
    if (!file) throw new BadRequestException('파일이 없습니다.');
    return this.sheetMusicService.upload(userId, songId, file);
  }

  @Delete(':id/sheet')
  deleteSheet(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('id') songId: string,
  ) {
    if (userRole !== 'admin') throw new ForbiddenException('관리자만 악보를 삭제할 수 있습니다.');
    return this.sheetMusicService.remove(userId, songId);
  }
}

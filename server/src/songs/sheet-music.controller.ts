import {
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Post,
  Delete,
  Param,
  UseGuards,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { SheetMusicService } from './sheet-music.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiskUpload } from '../storage/disk-upload.decorator';
import { SHEET_MIMES } from '../storage/upload-mime';
import { validateUpload } from '../storage/upload-media';

@Injectable()
class SheetMusicAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    if (user?.role !== 'admin') {
      throw new ForbiddenException('관리자만 악보를 변경할 수 있습니다.');
    }
    return true;
  }
}

@UseGuards(JwtAuthGuard, SheetMusicAdminGuard)
@Controller('songs')
export class SheetMusicController {
  constructor(private sheetMusicService: SheetMusicService) {}

  @Post(':id/sheet')
  @DiskUpload(SHEET_MIMES, 10)
  async uploadSheet(
    @CurrentUser('sub') userId: string,
    @Param('id') songId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await validateUpload(SHEET_MIMES, file);
    return this.sheetMusicService.upload(userId, songId, file);
  }

  @Delete(':id/sheet')
  deleteSheet(@Param('id') songId: string) {
    return this.sheetMusicService.remove(songId);
  }
}

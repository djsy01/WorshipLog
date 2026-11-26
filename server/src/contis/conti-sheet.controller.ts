import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DiskUpload } from '../storage/disk-upload.decorator';
import { SHEET_MIMES } from '../storage/upload-mime';
import { validateUpload } from '../storage/upload-media';
import { ContiSheetService } from './conti-sheet.service';

@UseGuards(JwtAuthGuard)
@Controller('contis/:id/songs/:contiSongId/sheet')
export class ContiSheetController {
  constructor(private sheetService: ContiSheetService) {}

  @Post()
  @DiskUpload(SHEET_MIMES, 10)
  async upload(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Param('contiSongId') contiSongId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await validateUpload(SHEET_MIMES, file);
    return this.sheetService.upload(userId, contiId, contiSongId, file);
  }

  @Delete(':sheetId')
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id') contiId: string,
    @Param('contiSongId') contiSongId: string,
    @Param('sheetId') sheetId: string,
  ) {
    return this.sheetService.remove(userId, contiId, contiSongId, sheetId);
  }
}

import { Controller, Post, UseGuards, UploadedFile } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiskUpload } from '../storage/disk-upload.decorator';
import { UPLOAD_MIMES } from '../storage/upload-mime';
import { validateUpload } from '../storage/upload-media';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @DiskUpload(UPLOAD_MIMES, 50)
  async upload(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await validateUpload(UPLOAD_MIMES, file);
    return this.uploadService.upload(userId, file);
  }
}

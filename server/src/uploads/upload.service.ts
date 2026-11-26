import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { uploadName } from '../storage/upload-mime';

@Injectable()
export class UploadService {
  constructor(private storage: StorageService) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const name = uploadName(String(Date.now()), file.mimetype);
    const url = await this.storage.save(
      `community/${userId}/${name}`,
      file.path,
    );
    return { url };
  }
}

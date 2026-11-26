import { StorageService } from '../storage/storage.service';
import { uploadName } from '../storage/upload-mime';

export async function storeSheet<T>(
  storage: StorageService,
  userId: string,
  prefix: string,
  file: Express.Multer.File,
  write: (url: string) => Promise<T>,
) {
  const key = `${userId}/${uploadName(prefix, file.mimetype)}`;
  const url = await storage.save(key, file.path);
  try {
    return await write(url);
  } catch (error) {
    await storage.removeByUrl(url);
    throw error;
  }
}

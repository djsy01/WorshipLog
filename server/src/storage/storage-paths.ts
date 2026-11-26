import { mkdir, realpath } from 'fs/promises';
import { join } from 'path';

export async function prepareDirectory(root: string, path: string) {
  await mkdir(root, { recursive: true });
  let directory = await realpath(root);
  for (const segment of path.split('/')) {
    directory = join(directory, segment);
    await mkdir(directory, { recursive: true });
    if ((await realpath(directory)) !== directory) throw new Error();
  }
}

import { randomUUID } from 'crypto';

const EXTENSIONS = new Map(
  Object.entries({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-msvideo': 'avi',
  }),
);

const MIME_ALIASES = new Map(
  Object.entries({
    'audio/x-m4a': 'audio/mp4',
    'audio/ogg; codecs=opus': 'audio/ogg',
    'video/vnd.avi': 'video/x-msvideo',
    'video/x-m4v': 'video/mp4',
  }),
);

export const SHEET_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const UPLOAD_MIMES = [...EXTENSIONS.keys()];
export const GENERIC_MIME = 'application/octet-stream';

export function uploadName(prefix: string, mime: string) {
  return `${prefix}-${randomUUID()}.${EXTENSIONS.get(mime)}`;
}

export function normalizeMime(mime: string) {
  return MIME_ALIASES.get(mime) ?? mime;
}

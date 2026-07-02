import multer from 'multer';

const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MEDIA_BYTES },
}).single('file');

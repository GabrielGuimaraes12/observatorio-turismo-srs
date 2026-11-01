import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';

const uploadDir = join(process.cwd(), 'uploads', 'pdfs');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

export const pdfMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const hash = randomBytes(16).toString('hex');
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${hash}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdfMime && isPdfExt) {
      cb(null, true);
      return;
    }
    cb(new BadRequestException('Apenas arquivos PDF são permitidos.'), false);
  },
};
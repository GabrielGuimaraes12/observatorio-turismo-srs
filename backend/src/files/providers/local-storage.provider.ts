import { Injectable } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileStorage } from '../interfaces/file-storage.interface.js';
import type { Express } from 'express';

@Injectable()
export class LocalStorageProvider implements FileStorage {
  private readonly uploadDirectory = join(
    process.cwd(),
    'uploads',
    'reports',
  );

  async save(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string> {
    await mkdir(this.uploadDirectory, { recursive: true });

    const filePath = join(this.uploadDirectory, filename);

    await writeFile(filePath, file.buffer, { flag: 'wx' });

    return filename;
  }

  async read(filename: string): Promise<Buffer> {
    const filePath = join(this.uploadDirectory, filename);

    return readFile(filePath);
  }

  async delete(filename: string): Promise<void> {
    const filePath = join(this.uploadDirectory, filename);

    await unlink(filePath);
  }
}

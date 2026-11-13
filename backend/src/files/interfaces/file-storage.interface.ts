import type { Express } from 'express';

export interface FileStorage {
  save(
    file: Express.Multer.File,
    filename: string,
  ): Promise<string>;

  read(filename: string): Promise<Buffer>;

  delete(filename: string): Promise<void>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');

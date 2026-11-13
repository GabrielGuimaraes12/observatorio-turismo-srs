import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { FileStorage } from './interfaces/file-storage.interface.js';
import { FILE_STORAGE } from './interfaces/file-storage.token.js';
import type { Express } from 'express';

@Injectable()
export class FilesService {
  private readonly maxFileSize = 10 * 1024 * 1024;

  constructor(
    @Inject(FILE_STORAGE)
    private readonly storage: FileStorage,
  ) {}

  async savePdf(file: Express.Multer.File): Promise<string> {
    this.validatePdf(file);

    const filename = `${randomUUID()}.pdf`;

    return this.storage.save(file, filename);
  }

  async readPdf(filename: string): Promise<Buffer> {
    this.validateFilename(filename);

    try {
        return await this.storage.read(filename);
    } catch (error) {
        if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
        ) {
        throw new NotFoundException('PDF não encontrado.');
        }

        throw error;
    }
 }
  async deletePdf(filename: string): Promise<void> {
    this.validateFilename(filename);

    await this.storage.delete(filename);
  }

  private validatePdf(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Um arquivo PDF é obrigatório.');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        'O arquivo PDF não pode ultrapassar 10 MB.',
      );
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        'Somente arquivos PDF são permitidos.',
      );
    }

    const signature = file.buffer.subarray(0, 5).toString();

    if (signature !== '%PDF-') {
      throw new BadRequestException(
        'O arquivo enviado não possui uma assinatura PDF válida.',
      );
    }
  }

  private validateFilename(filename: string): void {
    if (!this.isManagedFileReference(filename)) {
        throw new BadRequestException('Referência de arquivo inválida.');
    }
  }
  isManagedFileReference(filename: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(
        filename,
    );
}
}

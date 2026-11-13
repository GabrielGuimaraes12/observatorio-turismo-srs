import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service.js';
import type { FileStorage } from './interfaces/file-storage.interface.js';

describe('FilesService', () => {
  let service: FilesService;
  let storage: {
    save: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const validFile = {
    originalname: 'report.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.7 test content'),
  } as Express.Multer.File;

  beforeEach(() => {
    storage = {
      save: vi.fn(),
      read: vi.fn(),
      delete: vi.fn(),
    };

    service = new FilesService(storage as unknown as FileStorage);
  });

  describe('savePdf', () => {
    it('saves a valid PDF with a generated UUID filename', async () => {
      storage.save.mockImplementation(
        async (_file, filename) => filename,
      );

      const result = await service.savePdf(validFile);

      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i,
      );

      expect(storage.save).toHaveBeenCalledWith(validFile, result);
    });

    it('rejects when no file is provided', async () => {
      await expect(
        service.savePdf(undefined as unknown as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storage.save).not.toHaveBeenCalled();
    });

    it('rejects files larger than 10 MB', async () => {
      const oversizedFile = {
        ...validFile,
        size: 10 * 1024 * 1024 + 1,
      } as Express.Multer.File;

      await expect(
        service.savePdf(oversizedFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects files with a different MIME type', async () => {
      const invalidFile = {
        ...validFile,
        mimetype: 'image/png',
      } as Express.Multer.File;

      await expect(
        service.savePdf(invalidFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects files without a valid PDF signature', async () => {
      const invalidFile = {
        ...validFile,
        buffer: Buffer.from('not a PDF'),
      } as Express.Multer.File;

      await expect(
        service.savePdf(invalidFile),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('readPdf', () => {
    it('reads a PDF with a valid UUID filename', async () => {
      const filename = '550e8400-e29b-41d4-a716-446655440000.pdf';
      const content = Buffer.from('%PDF-1.7 test');

      storage.read.mockResolvedValue(content);

      await expect(service.readPdf(filename)).resolves.toBe(content);
      expect(storage.read).toHaveBeenCalledWith(filename);
    });

    it('rejects an invalid filename', async () => {
      await expect(
        service.readPdf('../secret.pdf'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storage.read).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the PDF does not exist', async () => {
      const error = Object.assign(new Error('File not found'), {
        code: 'ENOENT',
      });

      storage.read.mockRejectedValue(error);

      await expect(
        service.readPdf('550e8400-e29b-41d4-a716-446655440000.pdf'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates unexpected storage errors', async () => {
      const error = new Error('Storage unavailable');

      storage.read.mockRejectedValue(error);

      await expect(
        service.readPdf('550e8400-e29b-41d4-a716-446655440000.pdf'),
      ).rejects.toBe(error);
    });
  });

  describe('deletePdf', () => {
    it('deletes a PDF with a valid UUID filename', async () => {
      const filename = '550e8400-e29b-41d4-a716-446655440000.pdf';

      storage.delete.mockResolvedValue(undefined);

      await expect(service.deletePdf(filename)).resolves.toBeUndefined();
      expect(storage.delete).toHaveBeenCalledWith(filename);
    });

    it('rejects an invalid filename', async () => {
      await expect(
        service.deletePdf('../secret.pdf'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('isManagedFileReference', () => {
    it('recognizes valid managed PDF references', () => {
      expect(
        service.isManagedFileReference(
          '550e8400-e29b-41d4-a716-446655440000.pdf',
        ),
      ).toBe(true);
    });

    it('rejects external URLs and invalid references', () => {
      expect(
        service.isManagedFileReference('https://example.com/report.pdf'),
      ).toBe(false);

      expect(
        service.isManagedFileReference('../report.pdf'),
      ).toBe(false);
    });
  });
});

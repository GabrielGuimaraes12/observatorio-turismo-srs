import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { FilesService } from '../files/files.service.js';

describe('ReportsController', () => {
  let controller: ReportsController;

  let service: {
    findAll: Mock;
    findOne: Mock;
    create: Mock;
    update: Mock;
    remove: Mock;
    isFileUsedByAnotherReport: Mock;
  };

  let filesService: {
    savePdf: Mock;
    readPdf: Mock;
    deletePdf: Mock;
    isManagedFileReference: Mock;
  };

  const anonReq = {
    user: undefined as { id: string; role: string } | undefined,
  };

  const testFile = {
    originalname: 'report.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-test'),
  } as Express.Multer.File;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      isFileUsedByAnotherReport: vi.fn(),
    };

    filesService = {
      savePdf: vi.fn(),
      readPdf: vi.fn(),
      deletePdf: vi.fn(),
      isManagedFileReference: vi.fn(),
    };

    controller = new ReportsController(
      service as unknown as ReportsService,
      filesService as unknown as FilesService,
    );
  });

  it('findAll passes undefined when anonymous', async () => {
    const reports = [{ id: 'r1' }];
    service.findAll.mockResolvedValue(reports);

    await expect(controller.findAll(anonReq)).resolves.toBe(reports);
    expect(service.findAll).toHaveBeenCalledWith(undefined);
  });

  it('findAll passes the requester when authenticated', async () => {
    const reports = [{ id: 'r1' }];
    service.findAll.mockResolvedValue(reports);

    const req = {
      user: { id: 'user-business-1', role: 'BUSINESS' },
    };

    await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith({
      id: 'user-business-1',
      role: 'BUSINESS',
    });
  });

  it('findOne passes undefined when anonymous', async () => {
    const report = { id: 'r1' };
    service.findOne.mockResolvedValue(report);

    await expect(controller.findOne('r1', anonReq)).resolves.toBe(report);

    expect(service.findOne).toHaveBeenCalledWith('r1', undefined);
  });

  it('findOne passes the requester when authenticated', async () => {
    const report = { id: 'r1' };
    service.findOne.mockResolvedValue(report);

    const req = {
      user: { id: 'user-business-1', role: 'BUSINESS' },
    };

    await controller.findOne('r1', req);

    expect(service.findOne).toHaveBeenCalledWith('r1', {
      id: 'user-business-1',
      role: 'BUSINESS',
    });
  });


  it('getReportPdf returns the PDF with the correct headers', async () => {
    const fileUrl = '550e8400-e29b-41d4-a716-446655440000.pdf';
    const pdfBuffer = Buffer.from('%PDF-test');

    service.findOne.mockResolvedValue({
      id: 'r1',
      fileUrl,
    });

    filesService.readPdf.mockResolvedValue(pdfBuffer);

    const response = {
      set: vi.fn(),
      send: vi.fn(),
    };

    await controller.getReportPdf(
      'r1',
      anonReq,
      response as any,
    );

    expect(service.findOne).toHaveBeenCalledWith('r1', undefined);
    expect(filesService.readPdf).toHaveBeenCalledWith(fileUrl);

    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Content-Length': pdfBuffer.length,
      'X-Content-Type-Options': 'nosniff',
    });

    expect(response.send).toHaveBeenCalledWith(pdfBuffer);
  });

  it('getReportPdf rejects when the report has no PDF', async () => {
    service.findOne.mockResolvedValue({
      id: 'r1',
      fileUrl: null,
    });

    const response = {
      set: vi.fn(),
      send: vi.fn(),
    };

    await expect(
      controller.getReportPdf('r1', anonReq, response as any),
    ).rejects.toThrow('PDF não encontrado.');

    expect(filesService.readPdf).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  it('create passes the DTO, file reference and caller id', async () => {
    const dto = { title: 'T' };
    const fileUrl = '550e8400-e29b-41d4-a716-446655440000.pdf';
    const created = { id: 'new', ...dto, fileUrl };

    const req = {
      user: { id: 'user-business-1', role: 'BUSINESS' },
    };

    filesService.savePdf.mockResolvedValue(fileUrl);
    service.create.mockResolvedValue(created);

    await expect(
      controller.create(dto, testFile, req),
    ).resolves.toBe(created);

    expect(filesService.savePdf).toHaveBeenCalledWith(testFile);
    expect(service.create).toHaveBeenCalledWith(
      dto,
      'user-business-1',
      fileUrl,
    );
  });

  it('rejects direct publication by BUSINESS', async () => {
    const dto = {
      title: 'T',
      published: true,
    };

    const req = {
      user: { id: 'user-business-1', role: 'BUSINESS' },
    };

    await expect(
      controller.create(dto, testFile, req),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(filesService.savePdf).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('removes the uploaded file when report creation fails', async () => {
    const dto = { title: 'T' };
    const fileUrl = '550e8400-e29b-41d4-a716-446655440000.pdf';
    const error = new Error('Database error');

    const req = {
      user: { id: 'user-business-1', role: 'BUSINESS' },
    };

    filesService.savePdf.mockResolvedValue(fileUrl);
    service.create.mockRejectedValue(error);

    await expect(
      controller.create(dto, testFile, req),
    ).rejects.toBe(error);

    expect(filesService.deletePdf).toHaveBeenCalledWith(fileUrl);
  });

  it('update preserves the existing PDF when no new file is sent', async () => {
    const dto = { title: 'Renamed' };
    const existingReport = {
      id: 'r1',
      fileUrl: 'existing.pdf',
    };
    const updated = { id: 'r1', title: 'Renamed' };

    const req = {
      user: { id: 'user-admin-1', role: 'ADMIN' },
    };

    service.findOne.mockResolvedValue(existingReport);
    service.update.mockResolvedValue(updated);

    await expect(
      controller.update('r1', dto, undefined, req),
    ).resolves.toBe(updated);

    expect(service.update).toHaveBeenCalledWith(
      'r1',
      dto,
      req.user,
    );

    expect(filesService.savePdf).not.toHaveBeenCalled();
  });

  it('update replaces the PDF and removes the old file', async () => {
    const oldFile = '550e8400-e29b-41d4-a716-446655440001.pdf';
    const newFile = '550e8400-e29b-41d4-a716-446655440002.pdf';

    const existingReport = {
      id: 'r1',
      fileUrl: oldFile,
    };

    const updated = {
      id: 'r1',
      fileUrl: newFile,
    };

    const req = {
      user: { id: 'user-admin-1', role: 'ADMIN' },
    };

    service.findOne.mockResolvedValue(existingReport);
    filesService.savePdf.mockResolvedValue(newFile);
    service.update.mockResolvedValue(updated);
    filesService.isManagedFileReference.mockReturnValue(true);
    service.isFileUsedByAnotherReport.mockResolvedValue(false);

    await expect(
      controller.update('r1', { title: 'Updated' }, testFile, req),
    ).resolves.toBe(updated);

    expect(service.update).toHaveBeenCalledWith(
      'r1',
      { title: 'Updated' },
      req.user,
      newFile,
    );

    expect(filesService.deletePdf).toHaveBeenCalledWith(oldFile);
  });

  it('does not delete the old PDF when another report still uses it', async () => {
    const oldFile = '550e8400-e29b-41d4-a716-446655440001.pdf';
    const newFile = '550e8400-e29b-41d4-a716-446655440002.pdf';

    service.findOne.mockResolvedValue({
      id: 'r1',
      fileUrl: oldFile,
    });

    filesService.savePdf.mockResolvedValue(newFile);
    filesService.isManagedFileReference.mockReturnValue(true);
    service.isFileUsedByAnotherReport.mockResolvedValue(true);
    service.update.mockResolvedValue({
      id: 'r1',
      fileUrl: newFile,
    });

    const req = {
      user: { id: 'user-admin-1', role: 'ADMIN' },
    };

    await controller.update('r1', {}, testFile, req);

    expect(service.isFileUsedByAnotherReport).toHaveBeenCalledWith(
      oldFile,
      'r1',
    );

    expect(filesService.deletePdf).not.toHaveBeenCalled();
  });


  it('preserves the new file when the database update fails', async () => {
    const newFile = '550e8400-e29b-41d4-a716-446655440002.pdf';
    const error = new Error('Database error');

    service.findOne.mockResolvedValue({
      id: 'r1',
      fileUrl: 'old.pdf',
    });

    filesService.savePdf.mockResolvedValue(newFile);
    service.update.mockRejectedValue(error);

    const req = {
      user: { id: 'user-admin-1', role: 'ADMIN' },
    };

    await expect(
      controller.update('r1', {}, testFile, req),
    ).rejects.toBe(error);

    expect(filesService.deletePdf).toHaveBeenCalledWith(newFile);
  });

  it('remove delegates and preserves external file references', async () => {
    const report = {
      id: 'r1',
      fileUrl: 'https://example.com/report.pdf',
    };

    const result = { success: true, id: 'r1' };

    const req = {
      user: { id: 'user-admin-1', role: 'ADMIN' },
    };

    service.findOne.mockResolvedValue(report);
    service.remove.mockResolvedValue(result);
    filesService.isManagedFileReference.mockReturnValue(false);

    await expect(
      controller.remove('r1', req),
    ).resolves.toBe(result);

    expect(service.remove).toHaveBeenCalledWith('r1', req.user);
    expect(filesService.deletePdf).not.toHaveBeenCalled();
  });

  it('remove deletes the PDF when no other report uses it', async () => {
    const fileUrl = '550e8400-e29b-41d4-a716-446655440001.pdf';

    const report = {
      id: 'r1',
      fileUrl,
    };

    const req = {
      user: { id: 'user-admin-1', role: 'ADMIN' },
    };

    service.findOne.mockResolvedValue(report);
    service.remove.mockResolvedValue({ success: true, id: 'r1' });
    service.isFileUsedByAnotherReport.mockResolvedValue(false);
    filesService.isManagedFileReference.mockReturnValue(true);

    await controller.remove('r1', req);

    expect(filesService.deletePdf).toHaveBeenCalledWith(fileUrl);
  });
});

// ── Auth metadata contract ────────────────────────────────────────────────

import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';

describe('ReportsController — auth wiring', () => {
  const reflector = new Reflector();

  const guardsOf = (method: keyof ReportsController) =>
    Reflect.getMetadata(
      GUARDS_METADATA,
      ReportsController.prototype[method],
    ) ?? [];

  const rolesOf = (method: keyof ReportsController) =>
    reflector.get<string[]>(
      ROLES_KEY,
      ReportsController.prototype[method],
    );

  it.each(['create', 'update', 'remove'] as const)(
    '%s is guarded by JwtAuthGuard and RolesGuard',
    (method) => {
      const guards = guardsOf(method);

      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
    },
  );

  it('create requires ADMIN or BUSINESS role', () => {
    expect(rolesOf('create')).toEqual(['ADMIN', 'BUSINESS']);
  });

  it.each(['update', 'remove'] as const)(
    '%s requires the ADMIN role',
    (method) => {
      expect(rolesOf(method)).toEqual(['ADMIN']);
    },
  );

  it.each(['findAll', 'findOne'] as const)(
    '%s is guarded by OptionalJwtAuthGuard (public with optional auth)',
    (method) => {
      expect(guardsOf(method)).toContain(OptionalJwtAuthGuard);
    },
  );

  it.each(['findAll', 'findOne'] as const)(
    '%s has no role restriction',
    (method) => {
      expect(rolesOf(method)).toBeUndefined();
    },
  );
});

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    report: {
      findMany: Mock;
      findUnique: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
    period: { findUnique: Mock };
    sector: { findUnique: Mock };
  };

  const period = { id: 'period-1', name: '2024-Q1' };
  const sector = { id: 'sector-1', name: 'Turismo' };
  const author = { id: 'user-business-1', name: 'Biz', email: 'biz@example.com' };

  const publishedReport = {
    id: 'report-1',
    title: 'Published',
    description: 'desc',
    fileUrl: 'https://x/pub.pdf',
    published: true,
    periodId: 'period-1',
    sectorId: 'sector-1',
    authorId: author.id,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    period,
    sector,
    author,
  };

  const draftReport = {
    ...publishedReport,
    id: 'report-2',
    title: 'Draft',
    published: false,
  };

  beforeEach(() => {
    prisma = {
      report: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      period: { findUnique: vi.fn() },
      sector: { findUnique: vi.fn() },
    };
    service = new ReportsService(prisma as unknown as PrismaService);
  });

  // ── findAll — visibility ──────────────────────────────────────────────
  describe('findAll', () => {
    it('anonymous (no requester) queries published: true only', async () => {
      prisma.report.findMany.mockResolvedValue([publishedReport]);

      await service.findAll();

      expect(prisma.report.findMany).toHaveBeenCalledWith({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({ period: true }),
      });
    });

    it('USER requester sees published only', async () => {
      prisma.report.findMany.mockResolvedValue([publishedReport]);

      await service.findAll({ id: 'user-1', role: 'USER' });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } }),
      );
    });

    it('ADMIN requester sees published only (does not see drafts)', async () => {
      prisma.report.findMany.mockResolvedValue([publishedReport]);

      await service.findAll({ id: 'admin-1', role: 'ADMIN' });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } }),
      );
    });

    it('HR requester sees published only', async () => {
      prisma.report.findMany.mockResolvedValue([publishedReport]);

      await service.findAll({ id: 'hr-1', role: 'HR' });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } }),
      );
    });

    it('BUSINESS requester sees published + own drafts', async () => {
      prisma.report.findMany.mockResolvedValue([publishedReport, draftReport]);

      await service.findAll({ id: author.id, role: 'BUSINESS' });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { published: true },
              { authorId: author.id, published: false },
            ],
          },
        }),
      );
    });

    it('BUSINESS requester does not include drafts from other businesses', async () => {
      // The Prisma query itself enforces this via authorId. Verify the
      // filter contains authorId — that's the guard against cross-business
      // draft leakage.
      prisma.report.findMany.mockResolvedValue([]);

      await service.findAll({ id: author.id, role: 'BUSINESS' });

      const call = prisma.report.findMany.mock.calls[0][0];
      const orClause = call.where.OR as Array<Record<string, unknown>>;
      expect(orClause).toContainEqual({
        authorId: author.id,
        published: false,
      });
    });
  });

  // ── findOne — visibility ──────────────────────────────────────────────
  describe('findOne', () => {
    it('returns a published report to anonymous (no requester)', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);

      const result = await service.findOne('report-1');

      expect(result).toBe(publishedReport);
    });

    it('returns a published report to any role', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);

      for (const role of ['USER', 'BUSINESS', 'ADMIN', 'HR']) {
        const result = await service.findOne('report-1', {
          id: 'someone',
          role,
        });
        expect(result).toBe(publishedReport);
      }
    });

    it('returns a draft to its BUSINESS author', async () => {
      prisma.report.findUnique.mockResolvedValue(draftReport);

      const result = await service.findOne('report-2', {
        id: author.id,
        role: 'BUSINESS',
      });

      expect(result).toBe(draftReport);
    });

    it('throws NotFound when a draft is requested by anonymous', async () => {
      prisma.report.findUnique.mockResolvedValue(draftReport);

      await expect(service.findOne('report-2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFound when a draft is requested by another BUSINESS', async () => {
      prisma.report.findUnique.mockResolvedValue(draftReport);

      await expect(
        service.findOne('report-2', { id: 'other-business', role: 'BUSINESS' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when a draft is requested by ADMIN (only author sees drafts)', async () => {
      prisma.report.findUnique.mockResolvedValue(draftReport);

      await expect(
        service.findOne('report-2', { id: 'admin-1', role: 'ADMIN' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when the report does not exist', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('includes id in the NotFound message', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.findOne('abc-123')).rejects.toThrow(
        'Report abc-123 not found',
      );
    });
  });

  // ── create ────────────────────────────────────────────────────────────
  describe('create', () => {
    it('forwards every field plus authorId to Prisma', async () => {
      prisma.report.create.mockResolvedValue(publishedReport);

      const dto = {
        title: 'Annual',
        description: 'desc',
        fileUrl: 'https://x/pub.pdf',
        published: true,
        periodId: 'period-1',
        sectorId: 'sector-1',
      };

      await service.create(dto, author.id);

      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          title: 'Annual',
          description: 'desc',
          fileUrl: 'https://x/pub.pdf',
          published: true,
          periodId: 'period-1',
          authorId: author.id,
        },
        include: expect.objectContaining({ period: true }),
      });
    });

    it('defaults published to false when omitted', async () => {
      prisma.report.create.mockResolvedValue({ ...draftReport });

      await service.create(
        { title: 'Draft', fileUrl: 'https://x/d.pdf' },
        author.id,
      );

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ published: false }),
        }),
      );
    });

    it('assigns the authorId from the caller', async () => {
      prisma.report.create.mockResolvedValue(publishedReport);

      await service.create(
        { title: 'T', fileUrl: 'https://x/y.pdf' },
        'user-xyz',
      );

      const call = prisma.report.create.mock.calls[0][0];
      expect(call.data.authorId).toBe('user-xyz');
    });
  });

  // ── update ────────────────────────────────────────────────────────────
  describe('update', () => {
    it('verifies existence, then updates with the DTO', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.report.update.mockResolvedValue({
        ...publishedReport,
        title: 'Renamed',
      });

      const result = await service.update('report-1', { title: 'Renamed' });

      expect(prisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        include: expect.objectContaining({ period: true }),
      });
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { title: 'Renamed' },
        include: expect.objectContaining({ period: true }),
      });
      expect(result.title).toBe('Renamed');
    });

    it('throws NotFoundException and skips update when missing', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.report.update).not.toHaveBeenCalled();
    });

    it('strips undefined fields from the update payload', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.report.update.mockResolvedValue(publishedReport);

      await service.update('report-1', {
        title: 'Renamed',
        description: undefined,
      });

      const call = prisma.report.update.mock.calls[0][0];
      expect(call.data).toEqual({ title: 'Renamed' });
      expect(call.data).not.toHaveProperty('description');
    });
  });

  // ── remove ────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes the report and returns a success envelope', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.report.delete.mockResolvedValue(publishedReport);

      const result = await service.remove('report-1');

      expect(prisma.report.delete).toHaveBeenCalledWith({
        where: { id: 'report-1' },
      });
      expect(result).toEqual({ success: true, id: 'report-1' });
    });

    it('throws NotFoundException and skips delete when missing', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.report.delete).not.toHaveBeenCalled();
    });
  });
});
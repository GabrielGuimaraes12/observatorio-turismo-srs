import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    $transaction: Mock;
    report: {
      findMany: Mock;
      findUnique: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
    };
    period: { findUnique: Mock; upsert: Mock };
    sector: { findUnique: Mock };
  };

  const period = { id: 'period-1', name: '2024-Q1' };
  const sector = { id: 'sector-1', name: 'Turismo' };
  const author = {
    id: 'user-business-1',
    name: 'Biz',
    email: 'biz@example.com',
  };

  const publishedReport = {
    id: 'report-1',
    title: 'Published',
    description: 'desc',
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

  const fileUrl = '550e8400-e29b-41d4-a716-446655440000.pdf';

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(async (callback) => callback(prisma)),
      report: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      period: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
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

    it('ADMIN requester sees published reports and drafts', async () => {
      prisma.report.findMany.mockResolvedValue([publishedReport]);

      await service.findAll({ id: 'admin-1', role: 'ADMIN' });

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
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
        service.findOne('report-2', {
          id: 'other-business',
          role: 'BUSINESS',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns a draft to ADMIN', async () => {
      prisma.report.findUnique.mockResolvedValue(draftReport);

      await expect(
        service.findOne('report-2', { id: 'admin-1', role: 'ADMIN' }),
      ).resolves.toBe(draftReport);
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
    it('creates a report and associates an existing period', async () => {
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-12-31T00:00:00.000Z');

      prisma.period.upsert.mockResolvedValue(period);
      prisma.report.create.mockResolvedValue(publishedReport);

      const dto = {
        title: 'Annual',
        description: 'desc',
        published: true,
        period: {
          name: 'Período de teste',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        sectorId: 'sector-1',
      };

      await service.create(dto, author.id, fileUrl);

      expect(prisma.period.upsert).toHaveBeenCalledWith({
        where: {
          startDate_endDate: {
            startDate,
            endDate,
          },
        },
        update: {},
        create: {
          name: expect.any(String),
          startDate,
          endDate,
        },
      });

      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          title: 'Annual',
          description: 'desc',
          fileUrl,
          published: true,
          periodId: period.id,
          sectorId: 'sector-1',
          authorId: author.id,
        },
        include: expect.objectContaining({
          period: true,
          sector: true,
          author: { select: { id: true, name: true, email: true } },
        }),
      });
    });

    it('defaults published to false when omitted', async () => {
      prisma.report.create.mockResolvedValue({ ...draftReport });

      await service.create(
        { title: 'Draft' },
        author.id,
        fileUrl,
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
        { title: 'T' },
        'user-xyz',
        fileUrl,
      );

      const call = prisma.report.create.mock.calls[0][0];
      expect(call.data.authorId).toBe('user-xyz');
    });

    it('generates the period name automatically in Portuguese', async () => {
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-12-31T00:00:00.000Z');

      prisma.period.upsert.mockResolvedValue(period);
      prisma.report.create.mockResolvedValue(publishedReport);

      await service.create(
        {
          title: 'Annual',
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
        author.id,
        fileUrl,
      );

      expect(prisma.period.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            name: 'janeiro de 2026 a dezembro de 2026',
            startDate,
            endDate,
          },
        }),
      );
    });

    it('reuses an existing period with identical dates', async () => {
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-12-31T00:00:00.000Z');

      prisma.period.upsert.mockResolvedValue(period);
      prisma.report.create.mockResolvedValue(publishedReport);

      await service.create(
        {
          title: 'Annual',
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
        author.id,
        fileUrl,
      );

      expect(prisma.period.upsert).toHaveBeenCalledWith({
        where: {
          startDate_endDate: { startDate, endDate },
        },
        update: {},
        create: {
          name: 'janeiro de 2026 a dezembro de 2026',
          startDate,
          endDate,
        },
      });

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ periodId: period.id }),
        }),
      );
    });

    it('creates a report without a period', async () => {
      prisma.report.create.mockResolvedValue({
        ...publishedReport,
        periodId: null,
      });

      await service.create(
        { title: 'Without period' },
        author.id,
        fileUrl,
      );

      expect(prisma.period.upsert).not.toHaveBeenCalled();

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ periodId: null }),
        }),
      );
    });

    it('uses a transaction when creating a report', async () => {
      prisma.report.create.mockResolvedValue(publishedReport);

      await service.create(
        { title: 'Transactional report' },
        author.id,
        fileUrl,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid period without creating a report', async () => {
      await expect(
        service.create(
          {
            title: 'Invalid period',
            period: {
              startDate: '2026-12-31',
              endDate: '2026-01-01',
            },
          },
          author.id,
          fileUrl,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.report.create).not.toHaveBeenCalled();
      expect(prisma.period.upsert).not.toHaveBeenCalled();
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

      await expect(
        service.update('missing', { title: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);

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

    it('updates the report with an existing period', async () => {
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-12-31T00:00:00.000Z');

      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.period.upsert.mockResolvedValue(period);
      prisma.report.update.mockResolvedValue({
        ...publishedReport,
        periodId: period.id,
      });

      await service.update('report-1', {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      expect(prisma.period.upsert).toHaveBeenCalled();
      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'report-1' },
          data: { periodId: period.id },
        }),
      );
    });

    it('uses a transaction when updating a report', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.report.update.mockResolvedValue(publishedReport);

      await service.update('report-1', { title: 'Updated' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('creates a new period when updating with different dates', async () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z');
      const endDate = new Date('2025-12-31T00:00:00.000Z');
      const newPeriod = {
        id: 'period-2025',
        name: 'janeiro de 2025 a dezembro de 2025',
      };

      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.period.upsert.mockResolvedValue(newPeriod);
      prisma.report.update.mockResolvedValue({
        ...publishedReport,
        periodId: newPeriod.id,
      });

      await service.update('report-1', {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      expect(prisma.period.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            startDate_endDate: { startDate, endDate },
          },
          create: {
            name: 'janeiro de 2025 a dezembro de 2025',
            startDate,
            endDate,
          },
          update: {},
        }),
      );

      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { periodId: newPeriod.id },
        }),
      );
    });

    it('preserves the current period when period is omitted', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.report.update.mockResolvedValue(publishedReport);

      await service.update('report-1', { title: 'Updated' });

      expect(prisma.period.upsert).not.toHaveBeenCalled();

      const updateCall = prisma.report.update.mock.calls[0][0];

      expect(updateCall.data).not.toHaveProperty('periodId');
    });

    it('does not modify the shared period when updating a report', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);
      prisma.period.upsert.mockResolvedValue(period);
      prisma.report.update.mockResolvedValue(publishedReport);

      await service.update('report-1', {
        period: {
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
        },
      });

      expect(prisma.period.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {},
        }),
      );
    });

    it('rejects an invalid period when updating a report', async () => {
      prisma.report.findUnique.mockResolvedValue(publishedReport);

      await expect(
        service.update('report-1', {
          period: {
            startDate: '2026-12-31',
            endDate: '2026-01-01',
          },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.report.update).not.toHaveBeenCalled();
      expect(prisma.period.upsert).not.toHaveBeenCalled();
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

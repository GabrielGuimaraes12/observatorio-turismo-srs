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
  };

  const period = { id: 'period-1', name: '2024-Q1' };

  const report = {
    id: 'report-1',
    title: 'Annual report',
    description: 'Some description',
    fileUrl: 'https://cdn.example.com/report.pdf',
    published: true,
    periodId: 'period-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    period,
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
    };
    service = new ReportsService(prisma as unknown as PrismaService);
  });

  // ── findAll ────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('queries reports ordered by createdAt desc and includes period', async () => {
      prisma.report.findMany.mockResolvedValue([report]);

      const result = await service.findAll();

      expect(prisma.report.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.report.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { period: true },
      });
      expect(result).toEqual([report]);
    });

    it('returns an empty array when there are no reports', async () => {
      prisma.report.findMany.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('returns the report when found', async () => {
      prisma.report.findUnique.mockResolvedValue(report);

      const result = await service.findOne('report-1');

      expect(prisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        include: { period: true },
      });
      expect(result).toBe(report);
    });

    it('throws NotFoundException when the report does not exist', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('includes the id in the NotFound message', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.findOne('abc-123')).rejects.toThrow(
        'Report abc-123 not found',
      );
    });
  });

  // ── create ─────────────────────────────────────────────────────────────
  describe('create', () => {
    it('forwards every DTO field to Prisma and includes period', async () => {
      prisma.report.create.mockResolvedValue(report);

      const dto = {
        title: 'Annual report',
        description: 'Some description',
        fileUrl: 'https://cdn.example.com/report.pdf',
        published: true,
        periodId: 'period-1',
      };

      const result = await service.create(dto);

      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          title: 'Annual report',
          description: 'Some description',
          fileUrl: 'https://cdn.example.com/report.pdf',
          published: true,
          periodId: 'period-1',
        },
        include: { period: true },
      });
      expect(result).toBe(report);
    });

    it('defaults published to false when omitted', async () => {
      prisma.report.create.mockResolvedValue({ ...report, published: false });

      await service.create({
        title: 'Draft',
        fileUrl: 'https://cdn.example.com/draft.pdf',
      });

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ published: false }),
        }),
      );
    });

    it('preserves published=false when explicitly passed', async () => {
      prisma.report.create.mockResolvedValue({ ...report, published: false });

      await service.create({
        title: 'Draft',
        fileUrl: 'https://cdn.example.com/draft.pdf',
        published: false,
      });

      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ published: false }),
        }),
      );
    });

    it('passes through undefined optional fields without crashing', async () => {
      prisma.report.create.mockResolvedValue(report);

      await service.create({
        title: 'Minimal',
        fileUrl: 'https://cdn.example.com/min.pdf',
      });

      const arg = prisma.report.create.mock.calls[0][0];
      expect(arg.data.description).toBeUndefined();
      expect(arg.data.periodId).toBeUndefined();
    });
  });

  // ── update ─────────────────────────────────────────────────────────────
  describe('update', () => {
    it('verifies existence, then updates with the DTO', async () => {
      prisma.report.findUnique.mockResolvedValue(report);
      prisma.report.update.mockResolvedValue({ ...report, title: 'Renamed' });

      const result = await service.update('report-1', { title: 'Renamed' });

      // findOne must be called first
      expect(prisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        include: { period: true },
      });
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { title: 'Renamed' },
        include: { period: true },
      });
      expect(result.title).toBe('Renamed');
    });

    it('throws NotFoundException and skips update when the report is missing', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.report.update).not.toHaveBeenCalled();
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes the report and returns a success envelope', async () => {
      prisma.report.findUnique.mockResolvedValue(report);
      prisma.report.delete.mockResolvedValue(report);

      const result = await service.remove('report-1');

      expect(prisma.report.delete).toHaveBeenCalledWith({
        where: { id: 'report-1' },
      });
      expect(result).toEqual({ success: true, id: 'report-1' });
    });

    it('throws NotFoundException and skips delete when the report is missing', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.report.delete).not.toHaveBeenCalled();
    });
  });
});
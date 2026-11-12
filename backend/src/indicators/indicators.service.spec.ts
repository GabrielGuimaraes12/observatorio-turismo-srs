import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorService } from './indicators.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('IndicatorService', () => {
  let service: IndicatorService;
  let prisma: PrismaService;

  const mockPrismaService = {
    indicator: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    period: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IndicatorService>(IndicatorService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista de indicadores ordenados', async () => {
      const resultMock = [{ id: '1', name: 'Indicator 1' }];
      mockPrismaService.indicator.findMany.mockResolvedValue(resultMock);

      const result = await service.findAll();

      expect(result).toEqual(resultMock);
      expect(prisma.indicator.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { sector: true, period: true },
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um indicador específico quando existir', async () => {
      const resultMock = { id: 'uuid-123', name: 'Indicator 1' };
      mockPrismaService.indicator.findUnique.mockResolvedValue(resultMock);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(resultMock);
      expect(prisma.indicator.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        include: { sector: true, period: true },
      });
    });

    it('deve lançar NotFoundException se o indicador não for encontrado', async () => {
      mockPrismaService.indicator.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('deve criar um novo indicador com sucesso', async () => {
      const dto = {
        name: 'Inflação',
        value: 4.5,
        sectorId: 'uuid-sector',
        period: {
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      };

      const periodMock = {
        id: 'uuid-period',
        name: 'janeiro de 2026 a dezembro de 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      };

      const createdMock = {
        id: 'uuid-123',
        name: dto.name,
        value: dto.value,
        sectorId: dto.sectorId,
        periodId: periodMock.id,
        published: false,
      };

      mockPrismaService.period.upsert.mockResolvedValue(periodMock);
      mockPrismaService.indicator.create.mockResolvedValue(createdMock);

      const result = await service.create(dto as any);

      expect(result).toEqual(createdMock);
      expect(prisma.period.upsert).toHaveBeenCalled();
      expect(prisma.indicator.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: undefined,
          value: dto.value,
          unit: undefined,
          published: false,
          sectorId: dto.sectorId,
          periodId: periodMock.id,
        },
        include: { sector: true, period: true },
      });
    });

    it('generates the period name automatically in Portuguese', async () => {
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      const endDate = new Date('2026-12-31T00:00:00.000Z');

      mockPrismaService.period.upsert.mockResolvedValue({
        id: 'uuid-period',
      });
      mockPrismaService.indicator.create.mockResolvedValue({ id: 'uuid-123' });

      await service.create({
        name: 'Inflação',
        value: 4.5,
        sectorId: 'uuid-sector',
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      } as any);

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
    });

    it('uses a transaction when creating an indicator', async () => {
      mockPrismaService.period.upsert.mockResolvedValue({
        id: 'uuid-period',
      });
      mockPrismaService.indicator.create.mockResolvedValue({
        id: 'uuid-123',
      });

      await service.create({
        name: 'Inflação',
        value: 4.5,
        sectorId: 'uuid-sector',
        period: {
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
      } as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid period without creating an indicator', async () => {
      await expect(
        service.create({
          name: 'Inflação',
          value: 4.5,
          sectorId: 'uuid-sector',
          period: {
            startDate: '2026-12-31',
            endDate: '2026-01-01',
          },
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.period.upsert).not.toHaveBeenCalled();
      expect(prisma.indicator.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar um indicador existente', async () => {
      const existingMock = { id: 'uuid-123', name: 'Old Name' };
      const updatedMock = { id: 'uuid-123', name: 'New Name' };

      mockPrismaService.indicator.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.indicator.update.mockResolvedValue(updatedMock);

      const result = await service.update('uuid-123', {
        name: 'New Name',
      });

      expect(result).toEqual(updatedMock);
      expect(prisma.indicator.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: { name: 'New Name' },
        include: { sector: true, period: true },
      });
    });

    it('deve atualizar o período de um indicador existente', async () => {
      const existingMock = { id: 'uuid-123', name: 'Old Name' };
      const periodMock = {
        id: 'uuid-new-period',
        name: 'janeiro de 2025 a dezembro de 2025',
      };
      const updatedMock = {
        id: 'uuid-123',
        name: 'Old Name',
        periodId: periodMock.id,
      };

      mockPrismaService.indicator.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.period.upsert.mockResolvedValue(periodMock);
      mockPrismaService.indicator.update.mockResolvedValue(updatedMock);

      const result = await service.update('uuid-123', {
        period: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        },
      } as any);

      expect(result).toEqual(updatedMock);
      expect(prisma.period.upsert).toHaveBeenCalled();
      expect(prisma.indicator.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: { periodId: periodMock.id },
        include: { sector: true, period: true },
      });
    });

    it('preserves the current period when period is omitted', async () => {
      const existingMock = {
        id: 'uuid-123',
        name: 'Old Name',
        periodId: 'uuid-current-period',
      };

      mockPrismaService.indicator.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.indicator.update.mockResolvedValue(existingMock);

      await service.update('uuid-123', {
        name: 'New Name',
      });

      expect(prisma.period.upsert).not.toHaveBeenCalled();

      expect(prisma.indicator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-123' },
          data: { name: 'New Name' },
        }),
      );
    });

    it('does not modify a shared period when updating an indicator', async () => {
      const existingMock = {
        id: 'uuid-123',
        name: 'Old Name',
        periodId: 'uuid-current-period',
      };

      mockPrismaService.indicator.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.period.upsert.mockResolvedValue({
        id: 'uuid-new-period',
      });
      mockPrismaService.indicator.update.mockResolvedValue({
        ...existingMock,
        periodId: 'uuid-new-period',
      });

      await service.update('uuid-123', {
        period: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        },
      } as any);

      expect(prisma.period.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {},
        }),
      );

      expect(prisma.indicator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { periodId: 'uuid-new-period' },
        }),
      );
    });

    it('rejects an invalid period when updating an indicator', async () => {
      mockPrismaService.indicator.findUnique.mockResolvedValue({
        id: 'uuid-123',
        name: 'Old Name',
      });

      await expect(
        service.update('uuid-123', {
          period: {
            startDate: '2026-12-31',
            endDate: '2026-01-01',
          },
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.period.upsert).not.toHaveBeenCalled();
      expect(prisma.indicator.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover um indicador existente com sucesso', async () => {
      const existingMock = { id: 'uuid-123', name: 'Indicator' };

      mockPrismaService.indicator.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.indicator.delete.mockResolvedValue(existingMock);

      const result = await service.remove('uuid-123');

      expect(result).toEqual({ success: true, id: 'uuid-123' });
      expect(prisma.indicator.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });
  });
});

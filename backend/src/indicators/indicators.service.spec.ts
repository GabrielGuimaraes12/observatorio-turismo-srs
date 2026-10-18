import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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
        periodId: 'uuid-period',
      };
      const createdMock = { id: 'uuid-123', ...dto, published: false };

      mockPrismaService.indicator.create.mockResolvedValue(createdMock);

      const result = await service.create(dto as any);
      expect(result).toEqual(createdMock);
      expect(prisma.indicator.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve atualizar um indicador existente', async () => {
      const existingMock = { id: 'uuid-123', name: 'Old Name' };
      const updatedMock = { id: 'uuid-123', name: 'New Name' };

      mockPrismaService.indicator.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.indicator.update.mockResolvedValue(updatedMock);

      const result = await service.update('uuid-123', { name: 'New Name' });
      expect(result).toEqual(updatedMock);
      expect(prisma.indicator.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: { name: 'New Name' },
        include: { sector: true, period: true },
      });
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
import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PeriodService } from './periods.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('PeriodService', () => {
  let service: PeriodService;
  let prisma: PrismaService;

  const mockPrismaService = {
    period: {
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
        PeriodService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PeriodService>(PeriodService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista de períodos[cite: 16]', async () => {
      const resultMock = [{ id: '1', name: '2026-Q1' }];
      mockPrismaService.period.findMany.mockResolvedValue(resultMock);

      const result = await service.findAll();
      expect(result).toEqual(resultMock);
      expect(prisma.period.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { indicators: true, reports: true },
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um período específico quando existir[cite: 16]', async () => {
      const resultMock = { id: 'uuid-123', name: 'Janeiro' };
      mockPrismaService.period.findUnique.mockResolvedValue(resultMock);

      const result = await service.findOne('uuid-123');
      expect(result).toEqual(resultMock);
    });

    it('deve lançar NotFoundException se o período não for encontrado[cite: 16]', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('deve criar um período com sucesso se startDate for anterior a endDate[cite: 16]', async () => {
      const dto = {
        name: 'Q1',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      };
      const createdMock = { id: 'uuid-123', ...dto };

      mockPrismaService.period.create.mockResolvedValue(createdMock);

      const result = await service.create(dto);
      expect(result).toEqual(createdMock);
    });

    it('deve lançar BadRequestException se startDate for maior ou igual a endDate[cite: 16]', async () => {
      const dto = {
        name: 'Q inválido',
        startDate: '2026-04-01',
        endDate: '2026-01-01',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve remover um período com sucesso[cite: 16]', async () => {
      const existingMock = { id: 'uuid-123', name: 'Período' };

      mockPrismaService.period.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.period.delete.mockResolvedValue(existingMock);

      const result = await service.remove('uuid-123');
      expect(result).toEqual({ success: true, id: 'uuid-123' });
    });

    it('deve lançar ConflictException se houver registros vinculados (P2003)[cite: 16]', async () => {
      const existingMock = { id: 'uuid-123', name: 'Período' };
      const prismaError: any = new Error('Foreign key constraint failed');
      prismaError.code = 'P2003';

      mockPrismaService.period.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.period.delete.mockRejectedValue(prismaError);

      await expect(service.remove('uuid-123')).rejects.toThrow(ConflictException);
    });
  });
});
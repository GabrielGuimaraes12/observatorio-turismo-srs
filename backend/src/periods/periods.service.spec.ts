import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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

  const include = { indicators: true, reports: true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PeriodService>(PeriodService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ───────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('retorna a lista com include e ordenação', async () => {
      const resultMock = [{ id: '1', name: '2026-Q1' }];
      mockPrismaService.period.findMany.mockResolvedValue(resultMock);

      const result = await service.findAll();

      expect(result).toEqual(resultMock);
      expect(prisma.period.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include,
      });
      expect(prisma.period.findMany).toHaveBeenCalledTimes(1);
    });

    it('retorna [] quando não há períodos', async () => {
      mockPrismaService.period.findMany.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna o período quando existir, com include', async () => {
      const resultMock = { id: 'uuid-123', name: 'Janeiro' };
      mockPrismaService.period.findUnique.mockResolvedValue(resultMock);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(resultMock);
      expect(prisma.period.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        include,
      });
    });

    it('lança NotFoundException com o id na mensagem quando não existir', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.findOne('uuid-x')).rejects.toThrow(
        'Period uuid-x not found',
      );
    });
  });

  // ── create ────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      name: 'Q1',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    };

    it('cria com sucesso e converte as datas para Date', async () => {
      mockPrismaService.period.create.mockResolvedValue({ id: 'uuid-123' });

      const result = await service.create(dto);

      expect(result).toEqual({ id: 'uuid-123' });
      const call = mockPrismaService.period.create.mock.calls[0][0];
      expect(call.data.name).toBe('Q1');
      expect(call.data.startDate).toBeInstanceOf(Date);
      expect(call.data.endDate).toBeInstanceOf(Date);
      expect(call.data.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(call.data.endDate.toISOString()).toBe('2026-03-31T00:00:00.000Z');
      expect(call.include).toEqual(include);
    });

    it('lança BadRequest quando startDate > endDate', async () => {
      await expect(
        service.create({
          name: 'inválido',
          startDate: '2026-04-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.period.create).not.toHaveBeenCalled();
    });

    it('lança BadRequest quando startDate === endDate', async () => {
      await expect(
        service.create({
          name: 'mesmo dia',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────
  describe('update', () => {
    const existing = { id: 'uuid-123', name: 'Existente' };

    beforeEach(() => {
      mockPrismaService.period.findUnique.mockResolvedValue(existing);
    });

    it('atualiza todos os campos e envia as datas como Date', async () => {
      mockPrismaService.period.update.mockResolvedValue({ id: 'uuid-123' });

      const result = await service.update('uuid-123', {
        name: 'Novo',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      expect(result).toEqual({ id: 'uuid-123' });
      const call = mockPrismaService.period.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'uuid-123' });
      expect(call.data.name).toBe('Novo');
      expect(call.data.startDate).toBeInstanceOf(Date);
      expect(call.data.endDate).toBeInstanceOf(Date);
      expect(call.include).toEqual(include);
    });

    it('atualiza apenas o nome quando datas não são enviadas', async () => {
      mockPrismaService.period.update.mockResolvedValue({ id: 'uuid-123' });

      await service.update('uuid-123', { name: 'Só nome' });

      const call = mockPrismaService.period.update.mock.calls[0][0];
      expect(call.data).toEqual({ name: 'Só nome' });
      expect(call.data).not.toHaveProperty('startDate');
      expect(call.data).not.toHaveProperty('endDate');
    });

    it('atualiza apenas startDate quando endDate está ausente', async () => {
      mockPrismaService.period.update.mockResolvedValue({ id: 'uuid-123' });

      await service.update('uuid-123', { startDate: '2026-02-01' });

      const call = mockPrismaService.period.update.mock.calls[0][0];
      expect(call.data).toHaveProperty('startDate');
      expect(call.data).not.toHaveProperty('endDate');
      expect(call.data).not.toHaveProperty('name');
    });

    it('atualiza apenas endDate quando startDate está ausente', async () => {
      mockPrismaService.period.update.mockResolvedValue({ id: 'uuid-123' });

      await service.update('uuid-123', { endDate: '2026-12-31' });

      const call = mockPrismaService.period.update.mock.calls[0][0];
      expect(call.data).toHaveProperty('endDate');
      expect(call.data).not.toHaveProperty('startDate');
    });

    it('omite name quando undefined (não envia undefined ao Prisma)', async () => {
      mockPrismaService.period.update.mockResolvedValue({ id: 'uuid-123' });

      await service.update('uuid-123', { name: undefined, endDate: '2026-12-31' });

      const call = mockPrismaService.period.update.mock.calls[0][0];
      expect(call.data).not.toHaveProperty('name');
    });

    it('lança BadRequest quando startDate >= endDate', async () => {
      await expect(
        service.update('uuid-123', {
          startDate: '2026-04-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.period.update).not.toHaveBeenCalled();
    });

    it('lança BadRequest quando startDate === endDate', async () => {
      await expect(
        service.update('uuid-123', {
          startDate: '2026-01-01',
          endDate: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('propaga NotFound quando o período não existe', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(null);

      await expect(
        service.update('uuid-x', { name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.period.update).not.toHaveBeenCalled();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────
  describe('remove', () => {
    const existing = { id: 'uuid-123', name: 'Período' };

    it('remove com sucesso e retorna { success, id }', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(existing);
      mockPrismaService.period.delete.mockResolvedValue(existing);

      const result = await service.remove('uuid-123');

      expect(result).toEqual({ success: true, id: 'uuid-123' });
      expect(prisma.period.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('lança NotFound quando o período não existe (delete não é chamado)', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(null);

      await expect(service.remove('uuid-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.period.delete).not.toHaveBeenCalled();
    });

    it('lança Conflict quando há registros vinculados (P2003)', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(existing);
      const prismaError: any = new Error('Foreign key constraint failed');
      prismaError.code = 'P2003';
      mockPrismaService.period.delete.mockRejectedValue(prismaError);

      await expect(service.remove('uuid-123')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('re-lança erros que não são P2003', async () => {
      mockPrismaService.period.findUnique.mockResolvedValue(existing);
      const other: any = new Error('db down');
      other.code = 'P2025';
      mockPrismaService.period.delete.mockRejectedValue(other);

      await expect(service.remove('uuid-123')).rejects.toBe(other);
      await expect(service.remove('uuid-123')).rejects.not.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
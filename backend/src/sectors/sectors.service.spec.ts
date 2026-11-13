import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SectorService } from './sectors.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('SectorService', () => {
  let service: SectorService;
  let prisma: PrismaService;

  const mockPrismaService = {
    sector: {
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
        SectorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SectorService>(SectorService);
    prisma = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar uma lista de setores', async () => {
      const resultMock = [{ id: '1', name: 'Turismo' }];
      mockPrismaService.sector.findMany.mockResolvedValue(resultMock);

      const result = await service.findAll();
      expect(result).toEqual(resultMock);
      expect(prisma.sector.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { indicators: true },
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um setor específico quando existir', async () => {
      const resultMock = { id: 'uuid-123', name: 'Hotelaria' };
      mockPrismaService.sector.findUnique.mockResolvedValue(resultMock);

      const result = await service.findOne('uuid-123');
      expect(result).toEqual(resultMock);
    });

    it('deve lançar NotFoundException se o setor não for encontrado', async () => {
      mockPrismaService.sector.findUnique.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('deve criar um setor com sucesso[cite: 11]', async () => {
      const dto = { name: 'Gastronomia', description: 'Setor de alimentos' };
      const createdMock = { id: 'uuid-123', ...dto };

      mockPrismaService.sector.create.mockResolvedValue(createdMock);

      const result = await service.create(dto);
      expect(result).toEqual(createdMock);
    });

    it('deve lançar ConflictException se o nome do setor já existir (P2002)[cite: 11]', async () => {
      const dto = { name: 'Gastronomia' };
      const prismaError: any = new Error('Unique constraint failed');
      prismaError.code = 'P2002';

      mockPrismaService.sector.create.mockRejectedValue(prismaError);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('deve atualizar um setor existente[cite: 11]', async () => {
      const existingMock = { id: 'uuid-123', name: 'Old Name' };
      const updatedMock = { id: 'uuid-123', name: 'New Name' };

      mockPrismaService.sector.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.sector.update.mockResolvedValue(updatedMock);

      const result = await service.update('uuid-123', { name: 'New Name' });
      expect(result).toEqual(updatedMock);
    });

    it('deve lançar NotFoundException ao atualizar setor inexistente', async () => {
      mockPrismaService.sector.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { name: 'Novo nome' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.sector.update).not.toHaveBeenCalled();
    });

    it('deve lançar ConflictException ao atualizar para um nome duplicado (P2002)', async () => {
      const existingMock = { id: 'uuid-123', name: 'Hotelaria' };
      const prismaError: any = new Error('Unique constraint failed');
      prismaError.code = 'P2002';

      mockPrismaService.sector.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.sector.update.mockRejectedValue(prismaError);

      await expect(
        service.update('uuid-123', { name: 'Gastronomia' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve remover um setor com sucesso[cite: 11]', async () => {
      const existingMock = { id: 'uuid-123', name: 'Setor' };

      mockPrismaService.sector.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.sector.delete.mockResolvedValue(existingMock);

      const result = await service.remove('uuid-123');
      expect(result).toEqual({ success: true, id: 'uuid-123' });
    });

    it('deve lançar ConflictException se houver indicadores vinculados (P2003)[cite: 11]', async () => {
      const existingMock = { id: 'uuid-123', name: 'Setor' };
      const prismaError: any = new Error('Foreign key constraint failed');
      prismaError.code = 'P2003';

      mockPrismaService.sector.findUnique.mockResolvedValue(existingMock);
      mockPrismaService.sector.delete.mockRejectedValue(prismaError);

      await expect(service.remove('uuid-123')).rejects.toThrow(ConflictException);
    });

    it('deve lançar NotFoundException ao remover setor inexistente', async () => {
      mockPrismaService.sector.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('inexistente'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.sector.delete).not.toHaveBeenCalled();
    });

    it('create re-throws non-P2002 errors unchanged', async () => {
      const other: any = new Error('db down');
      other.code = 'P2025';
      mockPrismaService.sector.create.mockRejectedValue(other);
    
      await expect(service.create({ name: 'X' })).rejects.toBe(other);
      await expect(service.create({ name: 'X' })).rejects.not.toBeInstanceOf(
        ConflictException,
      );
    });
    
    it('update re-throws non-P2002 errors unchanged', async () => {
      mockPrismaService.sector.findUnique.mockResolvedValue({ id: 'uuid-123' });
      const other: any = new Error('db down');
      other.code = 'P2025';
      mockPrismaService.sector.update.mockRejectedValue(other);
    
      await expect(service.update('uuid-123', { name: 'X' })).rejects.toBe(other);
    });
    
    it('remove re-throws non-P2003 errors unchanged', async () => {
      mockPrismaService.sector.findUnique.mockResolvedValue({ id: 'uuid-123' });
      const other: any = new Error('db down');
      other.code = 'P2025';
      mockPrismaService.sector.delete.mockRejectedValue(other);
    
      await expect(service.remove('uuid-123')).rejects.toBe(other);
      await expect(service.remove('uuid-123')).rejects.not.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
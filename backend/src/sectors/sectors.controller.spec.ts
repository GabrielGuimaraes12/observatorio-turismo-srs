import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SectorController } from './sectors.controller.js';
import { SectorService } from './sectors.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

describe('SectorController', () => {
  let controller: SectorController;
  let service: SectorService;

  const mockSectorService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SectorController],
      providers: [
        {
          provide: SectorService,
          useValue: mockSectorService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SectorController>(SectorController);
    service = module.get<SectorService>(SectorService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve retornar todos os setores', async () => {
    const mockResult = [{ id: '1', name: 'Hotelaria' }];
    mockSectorService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll();
    expect(result).toEqual(mockResult);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('deve retornar um setor por id[cite: 13]', async () => {
    const mockResult = { id: 'uuid-1', name: 'Hotelaria' };
    mockSectorService.findOne.mockResolvedValue(mockResult);

    const result = await controller.findOne('uuid-1');
    expect(result).toEqual(mockResult);
    expect(service.findOne).toHaveBeenCalledWith('uuid-1');
  });

  it('deve criar um setor[cite: 13]', async () => {
    const dto = { name: 'Turismo' };
    const mockResult = { id: 'uuid-1', ...dto };
    mockSectorService.create.mockResolvedValue(mockResult);

    const result = await controller.create(dto);
    expect(result).toEqual(mockResult);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('deve atualizar um setor[cite: 13]', async () => {
    const dto = { name: 'Turismo Atualizado' };
    const mockResult = { id: 'uuid-1', ...dto };
    mockSectorService.update.mockResolvedValue(mockResult);

    const result = await controller.update('uuid-1', dto);
    expect(result).toEqual(mockResult);
    expect(service.update).toHaveBeenCalledWith('uuid-1', dto);
  });

  it('deve remover um setor[cite: 13]', async () => {
    const mockResult = { success: true, id: 'uuid-1' };
    mockSectorService.remove.mockResolvedValue(mockResult);

    const result = await controller.remove('uuid-1');
    expect(result).toEqual(mockResult);
    expect(service.remove).toHaveBeenCalledWith('uuid-1');
  });
});
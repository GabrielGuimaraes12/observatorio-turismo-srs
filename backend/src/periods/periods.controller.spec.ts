import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PeriodController } from './periods.controller.js';
import { PeriodService } from './periods.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

describe('PeriodController', () => {
  let controller: PeriodController;
  let service: PeriodService;

  const mockPeriodService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeriodController],
      providers: [
        {
          provide: PeriodService,
          useValue: mockPeriodService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PeriodController>(PeriodController);
    service = module.get<PeriodService>(PeriodService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve retornar todos os períodos', async () => {
    const mockResult = [{ id: '1', name: '2026-Q1' }];
    mockPeriodService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll();
    expect(result).toEqual(mockResult);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('deve retornar um período por id[cite: 18]', async () => {
    const mockResult = { id: 'uuid-1', name: '2026-Q1' };
    mockPeriodService.findOne.mockResolvedValue(mockResult);

    const result = await controller.findOne('uuid-1');
    expect(result).toEqual(mockResult);
    expect(service.findOne).toHaveBeenCalledWith('uuid-1');
  });

  it('deve criar um período[cite: 18]', async () => {
    const dto = { name: '2026-Q2', startDate: '2026-04-01', endDate: '2026-06-30' };
    const mockResult = { id: 'uuid-1', ...dto };
    mockPeriodService.create.mockResolvedValue(mockResult);

    const result = await controller.create(dto);
    expect(result).toEqual(mockResult);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('deve atualizar um período[cite: 18]', async () => {
    const dto = { name: '2026-Q2 Atualizado' };
    const mockResult = { id: 'uuid-1', ...dto };
    mockPeriodService.update.mockResolvedValue(mockResult);

    const result = await controller.update('uuid-1', dto);
    expect(result).toEqual(mockResult);
    expect(service.update).toHaveBeenCalledWith('uuid-1', dto);
  });

  it('deve remover um período[cite: 18]', async () => {
    const mockResult = { success: true, id: 'uuid-1' };
    mockPeriodService.remove.mockResolvedValue(mockResult);

    const result = await controller.remove('uuid-1');
    expect(result).toEqual(mockResult);
    expect(service.remove).toHaveBeenCalledWith('uuid-1');
  });
});
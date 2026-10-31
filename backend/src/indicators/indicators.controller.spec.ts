import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { IndicatorController } from './indicators.controller.js';
import { IndicatorService } from './indicators.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

describe('IndicatorController', () => {
  let controller: IndicatorController;
  let service: IndicatorService;

  const mockIndicatorService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndicatorController],
      providers: [
        {
          provide: IndicatorService,
          useValue: mockIndicatorService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IndicatorController>(IndicatorController);
    service = module.get<IndicatorService>(IndicatorService);

    vi.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve chamar findAll e retornar a lista de indicadores', async () => {
    const mockResult = [{ id: '1', name: 'PIB' }];
    mockIndicatorService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll();
    expect(result).toEqual(mockResult);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('deve chamar findOne com o id correto', async () => {
    const mockResult = { id: 'uuid-1', name: 'Inflação' };
    mockIndicatorService.findOne.mockResolvedValue(mockResult);

    const result = await controller.findOne('uuid-1');
    expect(result).toEqual(mockResult);
    expect(service.findOne).toHaveBeenCalledWith('uuid-1');
  });

  it('deve chamar create com o dto correto', async () => {
    const dto = { name: 'Emprego', value: 95.5, sectorId: 's1', periodId: 'p1' };
    const mockResult = { id: 'uuid-1', ...dto };
    mockIndicatorService.create.mockResolvedValue(mockResult);

    const result = await controller.create(dto as any);
    expect(result).toEqual(mockResult);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('deve chamar update com id e dto corretos', async () => {
    const dto = { name: 'Novo Nome' };
    const mockResult = { id: 'uuid-1', ...dto };
    mockIndicatorService.update.mockResolvedValue(mockResult);

    const result = await controller.update('uuid-1', dto as any);
    expect(result).toEqual(mockResult);
    expect(service.update).toHaveBeenCalledWith('uuid-1', dto);
  });

  it('deve chamar remove com o id correto', async () => {
    const mockResult = { success: true, id: 'uuid-1' };
    mockIndicatorService.remove.mockResolvedValue(mockResult);

    const result = await controller.remove('uuid-1');
    expect(result).toEqual(mockResult);
    expect(service.remove).toHaveBeenCalledWith('uuid-1');
  });
});
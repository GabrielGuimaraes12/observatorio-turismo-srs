import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: {
    findAll: Mock;
    findOne: Mock;
    create: Mock;
    update: Mock;
    remove: Mock;
  };

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new ReportsController(service as unknown as ReportsService);
  });

  it('findAll delegates to the service', async () => {
    const reports = [{ id: 'r1' }, { id: 'r2' }];
    service.findAll.mockResolvedValue(reports);

    await expect(controller.findAll()).resolves.toBe(reports);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne delegates with the id', async () => {
    const r = { id: 'r1' };
    service.findOne.mockResolvedValue(r);

    await expect(controller.findOne('r1')).resolves.toBe(r);
    expect(service.findOne).toHaveBeenCalledWith('r1');
  });

  it('create delegates with the DTO', async () => {
    const dto = {
      title: 'T',
      fileUrl: 'https://x/y.pdf',
    };
    const created = { id: 'new', ...dto };
    service.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('update delegates with id and DTO', async () => {
    const dto = { title: 'Renamed' };
    const updated = { id: 'r1', title: 'Renamed' };
    service.update.mockResolvedValue(updated);

    await expect(controller.update('r1', dto)).resolves.toBe(updated);
    expect(service.update).toHaveBeenCalledWith('r1', dto);
  });

  it('remove delegates with the id', async () => {
    const res = { success: true, id: 'r1' };
    service.remove.mockResolvedValue(res);

    await expect(controller.remove('r1')).resolves.toBe(res);
    expect(service.remove).toHaveBeenCalledWith('r1');
  });
});

// ── Auth metadata contract ────────────────────────────────────────────────
// Verifies the decorators on the controller are actually what we think they are.
// If someone removes @UseGuards/@Roles on a mutation endpoint, this test fails.
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';

describe('ReportsController — auth wiring', () => {
  const reflector = new Reflector();

  const guardsOf = (method: keyof ReportsController) =>
    Reflect.getMetadata(GUARDS_METADATA, ReportsController.prototype[method]) ?? [];

  const rolesOf = (method: keyof ReportsController) =>
    reflector.get<string[]>(ROLES_KEY, ReportsController.prototype[method]);

  it.each(['create', 'update', 'remove'] as const)(
    '%s is guarded by JwtAuthGuard and RolesGuard',
    (method) => {
      const guards = guardsOf(method);
      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
    },
  );

  it.each(['create', 'update', 'remove'] as const)(
    '%s requires the ADMIN role',
    (method) => {
      expect(rolesOf(method)).toEqual(['ADMIN']);
    },
  );

  it.each(['findAll', 'findOne'] as const)(
    '%s has no role restriction (public read)',
    (method) => {
      expect(rolesOf(method)).toBeUndefined();
    },
  );
});
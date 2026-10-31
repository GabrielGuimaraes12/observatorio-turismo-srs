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

  const anonReq = { user: undefined as { id: string; role: string } | undefined };

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

  it('findAll passes undefined when anonymous', async () => {
    const reports = [{ id: 'r1' }];
    service.findAll.mockResolvedValue(reports);

    await expect(controller.findAll(anonReq)).resolves.toBe(reports);
    expect(service.findAll).toHaveBeenCalledWith(undefined);
  });

  it('findAll passes the requester when authenticated', async () => {
    const reports = [{ id: 'r1' }];
    service.findAll.mockResolvedValue(reports);
    const req = { user: { id: 'user-business-1', role: 'BUSINESS' } };

    await controller.findAll(req);

    expect(service.findAll).toHaveBeenCalledWith({
      id: 'user-business-1',
      role: 'BUSINESS',
    });
  });

  it('findOne passes undefined when anonymous', async () => {
    const r = { id: 'r1' };
    service.findOne.mockResolvedValue(r);

    await expect(controller.findOne('r1', anonReq)).resolves.toBe(r);
    expect(service.findOne).toHaveBeenCalledWith('r1', undefined);
  });

  it('findOne passes the requester when authenticated', async () => {
    const r = { id: 'r1' };
    service.findOne.mockResolvedValue(r);
    const req = { user: { id: 'user-business-1', role: 'BUSINESS' } };

    await controller.findOne('r1', req);

    expect(service.findOne).toHaveBeenCalledWith('r1', {
      id: 'user-business-1',
      role: 'BUSINESS',
    });
  });

  it('create passes the DTO and the caller id', async () => {
    const dto = { title: 'T', fileUrl: 'https://x/y.pdf' };
    const created = { id: 'new', ...dto };
    service.create.mockResolvedValue(created);
    const req = { user: { id: 'user-business-1', role: 'BUSINESS' } };

    await expect(controller.create(dto, req)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto, 'user-business-1');
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
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
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

  it.each(['create'] as const)(
    '%s requires ADMIN or BUSINESS role',
    (method) => {
      expect(rolesOf(method)).toEqual(['ADMIN', 'BUSINESS']);
    },
  );

  it.each(['update', 'remove'] as const)(
    '%s requires the ADMIN role',
    (method) => {
      expect(rolesOf(method)).toEqual(['ADMIN']);
    },
  );

  it.each(['findAll', 'findOne'] as const)(
    '%s is guarded by OptionalJwtAuthGuard (public with optional auth)',
    (method) => {
      const guards = guardsOf(method);
      expect(guards).toContain(OptionalJwtAuthGuard);
    },
  );

  it.each(['findAll', 'findOne'] as const)(
    '%s has no role restriction',
    (method) => {
      expect(rolesOf(method)).toBeUndefined();
    },
  );
});
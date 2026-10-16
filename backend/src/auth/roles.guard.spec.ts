import { describe, it, expect, beforeEach, Mock } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

const makeContext = (user?: { role: string }): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows when required array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('throws when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('throws when the role is not allowed', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(makeContext({ role: 'USER' }))).toThrow(
      'Insufficient role',
    );
  });

  it('returns true when the role is allowed', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'USER']);
    expect(guard.canActivate(makeContext({ role: 'USER' }))).toBe(true);
  });
});
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtTokenService } from './jwt.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const makeContext = (headers: Record<string, string | undefined>): {
  ctx: ExecutionContext;
  request: { headers: Record<string, string | undefined>; user?: unknown };
} => {
  const request = { headers } as { headers: typeof headers; user?: unknown };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
};

describe('JwtAuthGuard', () => {
  let jwt: { getUserId: Mock };
  let prisma: { user: { findUnique: Mock } };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwt = { getUserId: vi.fn() };
    prisma = { user: { findUnique: vi.fn() } };
    guard = new JwtAuthGuard(
      jwt as unknown as JwtTokenService,
      prisma as unknown as PrismaService,
    );
  });

  it('throws when Authorization header is missing', async () => {
    const { ctx } = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws when the scheme is not Bearer', async () => {
    const { ctx } = makeContext({ authorization: 'Basic abc' });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Missing bearer token');
  });

  it('throws when the token is invalid', async () => {
    jwt.getUserId.mockImplementation(() => {
      throw new Error('bad');
    });
    const { ctx } = makeContext({ authorization: 'Bearer abc' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('throws when the user does not exist', async () => {
    jwt.getUserId.mockReturnValue('user-1');
    prisma.user.findUnique.mockResolvedValue(null);
    const { ctx } = makeContext({ authorization: 'Bearer abc' });
    await expect(guard.canActivate(ctx)).rejects.toThrow('User not found');
  });

  it('throws when the user is deactivated', async () => {
    jwt.getUserId.mockReturnValue('user-1');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      isActive: false,
    });
    const { ctx } = makeContext({ authorization: 'Bearer abc' });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Account is deactivated');
  });

  it('attaches the user to the request and returns true', async () => {
    jwt.getUserId.mockReturnValue('user-1');
    const user = { id: 'user-1', role: 'ADMIN', isActive: true };
    prisma.user.findUnique.mockResolvedValue(user);

    const { ctx, request } = makeContext({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toBe(user);
  });
});
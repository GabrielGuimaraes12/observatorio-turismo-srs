import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtTokenService } from './jwt.service.js';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;
  let jwtTokenService: { getUserId: Mock };
  let prisma: { user: { findUnique: Mock } };

  const activeUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'USER',
    isActive: true,
  };

  // Build a minimal ExecutionContext whose switchToHttp().getRequest()
  // returns a mutable request object — that's all the guard touches.
  const makeContext = (headers: Record<string, string | undefined>) => {
    const request: {
      headers: Record<string, string | undefined>;
      user?: unknown;
    } = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    jwtTokenService = { getUserId: vi.fn() };
    prisma = { user: { findUnique: vi.fn() } };
    guard = new OptionalJwtAuthGuard(
      jwtTokenService as unknown as JwtTokenService,
      prisma as unknown as PrismaService,
    );
  });

  it('allows anonymous requests with no Authorization header', async () => {
    const { context, request } = makeContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(jwtTokenService.getUserId).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows requests whose Authorization header is not Bearer', async () => {
    const { context, request } = makeContext({ authorization: 'Basic abc' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(jwtTokenService.getUserId).not.toHaveBeenCalled();
  });

  it('treats a malformed "Bearer" (no space) as anonymous', async () => {
    // "Bearer" without the trailing space does not start with "Bearer "
    const { context, request } = makeContext({ authorization: 'Bearer' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(jwtTokenService.getUserId).not.toHaveBeenCalled();
  });

  it('enriches the request with the user for a valid token', async () => {
    const { context, request } = makeContext({
      authorization: 'Bearer valid-token',
    });
    jwtTokenService.getUserId.mockReturnValue(activeUser.id);
    prisma.user.findUnique.mockResolvedValue(activeUser);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtTokenService.getUserId).toHaveBeenCalledWith('valid-token');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: activeUser.id },
    });
    expect(request.user).toBe(activeUser);
  });

  it('strips the "Bearer " prefix before passing the token to the JWT service', async () => {
    const { context } = makeContext({ authorization: 'Bearer abc.def.ghi' });
    jwtTokenService.getUserId.mockReturnValue(activeUser.id);
    prisma.user.findUnique.mockResolvedValue(activeUser);

    await guard.canActivate(context);

    expect(jwtTokenService.getUserId).toHaveBeenCalledWith('abc.def.ghi');
  });

  it('does not set request.user when the token is invalid (JWT throws)', async () => {
    const { context, request } = makeContext({
      authorization: 'Bearer broken',
    });
    jwtTokenService.getUserId.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not set request.user when the user no longer exists', async () => {
    const { context, request } = makeContext({
      authorization: 'Bearer valid-token',
    });
    jwtTokenService.getUserId.mockReturnValue('deleted-user');
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('does not set request.user when the user is deactivated', async () => {
    const { context, request } = makeContext({
      authorization: 'Bearer valid-token',
    });
    jwtTokenService.getUserId.mockReturnValue(activeUser.id);
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('swallows Prisma errors and treats the request as anonymous', async () => {
    const { context, request } = makeContext({
      authorization: 'Bearer valid-token',
    });
    jwtTokenService.getUserId.mockReturnValue(activeUser.id);
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('never throws, even when every downstream call fails', async () => {
    const { context } = makeContext({ authorization: 'Bearer x' });
    jwtTokenService.getUserId.mockImplementation(() => {
      throw new Error('boom');
    });
    prisma.user.findUnique.mockRejectedValue(new Error('also boom'));

    // The whole point of the guard is that public endpoints never 401.
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('returns true for an empty Bearer token (treated as anonymous)', async () => {
    const { context, request } = makeContext({ authorization: 'Bearer ' });
    jwtTokenService.getUserId.mockImplementation(() => {
      throw new Error('empty token');
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });
});
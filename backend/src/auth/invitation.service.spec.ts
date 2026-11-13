import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: {
    user: { findUnique: Mock };
    invitation: {
      findFirst: Mock;
      findUnique: Mock;
      create: Mock;
      updateMany: Mock;
      findMany: Mock;
      delete: Mock;
    };
    changeLog: { create: Mock };
  };

  const creator = { id: 'admin-1' };

  const activeInvitation = {
    id: 'inv-1',
    tokenHash: 'hashed',
    email: 'hr@example.com',
    role: 'HR',
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date('2024-01-01'),
    createdById: creator.id,
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      invitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      changeLog: { create: vi.fn() },
    };
    service = new InvitationService(prisma as unknown as PrismaService);
  });

  // ── isInvitableRole ───────────────────────────────────────────────────
  describe('isInvitableRole', () => {
    it('accepts HR, ADMIN and BUSINESS', () => {
      for (const role of ['HR', 'ADMIN', 'BUSINESS']) {
        expect(service.isInvitableRole(role)).toBe(true);
      }
    });

    it('rejects USER and unknown roles', () => {
      for (const role of ['USER', 'GUEST', '', 'admin', 'hr']) {
        expect(service.isInvitableRole(role)).toBe(false);
      }
    });
  });

  // ── create ────────────────────────────────────────────────────────────
  describe('create', () => {
    const baseInput = {
      email: 'HR@Example.com ',
      role: 'HR' as const,
      createdById: creator.id,
    };

    it('rejects a non-invitable role with ForbiddenException', async () => {
      await expect(
        service.create({ ...baseInput, role: 'USER' as never }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('rejects when the email is already a registered user (Conflict)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1' });

      await expect(service.create(baseInput)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('rejects when an active invitation already exists (Conflict)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(activeInvitation);

      await expect(service.create(baseInput)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('normalizes the email (trim + lowercase) before checking and storing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        ...activeInvitation,
        email: 'hr@example.com',
      });
      prisma.changeLog.create.mockResolvedValue({});

      await service.create(baseInput);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'hr@example.com' },
      });
      expect(prisma.invitation.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'hr@example.com',
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(prisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'hr@example.com' }),
      });
    });

    it('stores only the token hash, never the plaintext', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(activeInvitation);
      prisma.changeLog.create.mockResolvedValue({});

      await service.create(baseInput);

      const call = prisma.invitation.create.mock.calls[0][0];
      expect(call.data.tokenHash).toEqual(expect.any(String));
      expect(call.data.tokenHash).not.toHaveLength(0);
      expect(call.data).not.toHaveProperty('token');
    });

    it('returns the plaintext token exactly once', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(activeInvitation);
      prisma.changeLog.create.mockResolvedValue({});

      const result = await service.create(baseInput);

      expect(result).toMatchObject({
        id: activeInvitation.id,
        email: 'hr@example.com',
        role: 'HR',
        token: expect.any(String),
      });
      expect(result.token.length).toBeGreaterThan(20);
    });

    it('sets expiresAt roughly TTL_HOURS in the future (default 72h)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(activeInvitation);
      prisma.changeLog.create.mockResolvedValue({});

      const before = Date.now();
      await service.create(baseInput);
      const after = Date.now();

      const call = prisma.invitation.create.mock.calls[0][0];
      const expiresAt = (call.data.expiresAt as Date).getTime();
      const expectedMin = before + 72 * 3_600_000;
      const expectedMax = after + 72 * 3_600_000;
      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it('honors INVITATION_TTL_HOURS when set', async () => {
      const previous = process.env.INVITATION_TTL_HOURS;
      process.env.INVITATION_TTL_HOURS = '1';
      try {
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.invitation.findFirst.mockResolvedValue(null);
        prisma.invitation.create.mockResolvedValue(activeInvitation);
        prisma.changeLog.create.mockResolvedValue({});

        const before = Date.now();
        await service.create(baseInput);
        const after = Date.now();

        const call = prisma.invitation.create.mock.calls[0][0];
        const expiresAt = (call.data.expiresAt as Date).getTime();
        expect(expiresAt).toBeGreaterThanOrEqual(before + 3_600_000);
        expect(expiresAt).toBeLessThanOrEqual(after + 3_600_000);
      } finally {
        if (previous === undefined) delete process.env.INVITATION_TTL_HOURS;
        else process.env.INVITATION_TTL_HOURS = previous;
      }
    });

    it('writes a change log entry when createdById is present', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(activeInvitation);
      prisma.changeLog.create.mockResolvedValue({});

      await service.create(baseInput);

      expect(prisma.changeLog.create).toHaveBeenCalledWith({
        data: {
          action: 'invite-hr',
          entity: 'Invitation',
          entityId: activeInvitation.id,
          userId: creator.id,
        },
      });
    });

    it('skips the change log when createdById is null (bootstrap)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        ...activeInvitation,
        createdById: null,
      });

      await service.create({ ...baseInput, createdById: null });

      expect(prisma.changeLog.create).not.toHaveBeenCalled();
    });
  });

  // ── consume ───────────────────────────────────────────────────────────
  describe('consume', () => {
    const plaintext = 'some-plaintext-token';
    const email = 'hr@example.com';

    it('rejects when the token does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.consume(plaintext, email)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects an already-used invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...activeInvitation,
        usedAt: new Date(),
      });

      await expect(service.consume(plaintext, email)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects an expired invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...activeInvitation,
        expiresAt: new Date(Date.now() - 1_000),
      });

      await expect(service.consume(plaintext, email)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects when the email does not match', async () => {
      prisma.invitation.findUnique.mockResolvedValue(activeInvitation);

      await expect(
        service.consume(plaintext, 'someone-else@example.com'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('accepts a wildcard invitation (blank email) for any email', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...activeInvitation,
        email: '',
      });
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.consume(plaintext, 'anyone@example.com');

      expect(result).toEqual({
        role: activeInvitation.role,
        invitationId: activeInvitation.id,
      });
    });

    it('rejects when the atomic consume loses the race (count = 0)', async () => {
      prisma.invitation.findUnique.mockResolvedValue(activeInvitation);
      prisma.invitation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.consume(plaintext, email)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('marks the invitation as used and returns role + id', async () => {
      prisma.invitation.findUnique.mockResolvedValue(activeInvitation);
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.consume(plaintext, 'HR@example.com'); // case-insensitive

      expect(prisma.invitation.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(result).toEqual({
        role: activeInvitation.role,
        invitationId: activeInvitation.id,
      });
    });

    it('hashes the plaintext token before lookup', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.consume(plaintext, email)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      const call = prisma.invitation.findUnique.mock.calls[0][0];
      // 64 hex chars = SHA-256
      expect(call.where.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(call.where.tokenHash).not.toBe(plaintext);
    });
  });

  // ── listFor ───────────────────────────────────────────────────────────
  describe('listFor', () => {
    it('queries only active invitations created by the requester', async () => {
      prisma.invitation.findMany.mockResolvedValue([]);

      await service.listFor(creator.id);

      expect(prisma.invitation.findMany).toHaveBeenCalledWith({
        where: {
          createdById: creator.id,
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      });
    });

    it('never selects tokenHash', async () => {
      prisma.invitation.findMany.mockResolvedValue([]);

      await service.listFor(creator.id);

      const call = prisma.invitation.findMany.mock.calls[0][0];
      expect(call.select).not.toHaveProperty('tokenHash');
    });
  });

  // ── revoke ────────────────────────────────────────────────────────────
  describe('revoke', () => {
    it('rejects when the invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.revoke('missing', creator.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the invitation is already used', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...activeInvitation,
        usedAt: new Date(),
      });

      await expect(
        service.revoke(activeInvitation.id, creator.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when a different admin tries to revoke', async () => {
      prisma.invitation.findUnique.mockResolvedValue(activeInvitation);

      await expect(
        service.revoke(activeInvitation.id, 'admin-2'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.invitation.delete).not.toHaveBeenCalled();
    });

    it('allows the creator to revoke; deletes and logs', async () => {
      prisma.invitation.findUnique.mockResolvedValue(activeInvitation);
      prisma.invitation.delete.mockResolvedValue(activeInvitation);
      prisma.changeLog.create.mockResolvedValue({});

      const result = await service.revoke(activeInvitation.id, creator.id);

      expect(prisma.invitation.delete).toHaveBeenCalledWith({
        where: { id: activeInvitation.id },
      });
      expect(prisma.changeLog.create).toHaveBeenCalledWith({
        data: {
          action: 'revoke-invitation',
          entity: 'Invitation',
          entityId: activeInvitation.id,
          userId: creator.id,
        },
      });
      expect(result).toEqual({ success: true, id: activeInvitation.id });
    });

    it('allows revoking a bootstrap invitation with no creator', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        ...activeInvitation,
        createdById: null,
      });
      prisma.invitation.delete.mockResolvedValue(activeInvitation);
      prisma.changeLog.create.mockResolvedValue({});

      await expect(
        service.revoke(activeInvitation.id, 'any-admin'),
      ).resolves.toEqual({ success: true, id: activeInvitation.id });
    });
  });
});
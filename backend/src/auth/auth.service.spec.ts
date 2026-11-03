import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtTokenService } from './jwt.service.js';
import { InvitationService } from './invitation.service.js';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: Mock;
      create: Mock;
    };
    changeLog: {
      create: Mock;
    };
    $transaction: Mock;
  };
  let jwt: { createToken: Mock };
  let invitations: { consume: Mock };

  const baseUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    role: 'USER',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      changeLog: {
        create: vi.fn(),
      },
      // The service uses $transaction for register. We mock it to just
      // invoke the callback with a `tx` that is the same mock object.
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );

    jwt = { createToken: vi.fn().mockReturnValue('signed.jwt.token') };
    invitations = { consume: vi.fn() };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtTokenService,
      invitations as unknown as InvitationService,
    );
  });

  afterEach(() => vi.clearAllMocks());

  describe('register', () => {
    describe('without invitation token', () => {
      it('hashes the password, creates a USER, and returns a token', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue(baseUser);

        const result = await service.register(
          'Alice',
          'alice@example.com',
          'Passw0rd!',
        );

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'alice@example.com' },
        });
        expect(bcrypt.hash).toHaveBeenCalledWith('Passw0rd!', 10);
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: {
            name: 'Alice',
            email: 'alice@example.com',
            passwordHash: 'hashed',
            role: 'USER',
          },
        });
        expect(jwt.createToken).toHaveBeenCalledWith('user-1');
        expect(invitations.consume).not.toHaveBeenCalled();
        expect(result).toEqual({
          token: 'signed.jwt.token',
          user: {
            id: 'user-1',
            name: 'Alice',
            email: 'alice@example.com',
            role: 'USER',
            createdAt: baseUser.createdAt,
          },
        });
      });

      it('normalizes the email (trim + lowercase)', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue(baseUser);

        await service.register('Alice', '  ALICE@Example.COM  ', 'Passw0rd!');

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'alice@example.com' },
        });
        expect(prisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ email: 'alice@example.com' }),
          }),
        );
      });

      it('throws ConflictException if the email is already registered', async () => {
        prisma.user.findUnique.mockResolvedValue(baseUser);

        await expect(
          service.register('Alice', 'alice@example.com', 'Passw0rd!'),
        ).rejects.toThrow('Email already registered');

        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(jwt.createToken).not.toHaveBeenCalled();
        expect(invitations.consume).not.toHaveBeenCalled();
      });

      it('never returns the password hash', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue(baseUser);

        const result = await service.register(
          'Alice',
          'alice@example.com',
          'Passw0rd!',
        );

        expect(result.user).not.toHaveProperty('passwordHash');
      });
    });

    describe('with invitation token', () => {
      it('consumes the invitation, uses its role, and creates the user', async () => {
        invitations.consume.mockResolvedValue({
          role: 'ADMIN',
          invitationId: 'inv-1',
        });
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue({ ...baseUser, role: 'ADMIN' });

        const result = await service.register(
          'Alice',
          'alice@example.com',
          'Passw0rd!',
          'invitation-token-abc',
        );

        expect(invitations.consume).toHaveBeenCalledWith(
          'invitation-token-abc',
          'alice@example.com',
        );
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: {
            name: 'Alice',
            email: 'alice@example.com',
            passwordHash: 'hashed',
            role: 'ADMIN',
          },
        });
        expect(prisma.changeLog.create).toHaveBeenCalledWith({
          data: {
            action: 'register-admin',
            entity: 'User',
            entityId: 'user-1',
            userId: null,
          },
        });
        expect(result.user.role).toBe('ADMIN');
      });

      it('throws ConflictException when email is registered, before touching the invitation', async () => {
        prisma.user.findUnique.mockResolvedValue(baseUser);

        await expect(
          service.register(
            'Alice',
            'alice@example.com',
            'Passw0rd!',
            'invitation-token-abc',
          ),
        ).rejects.toThrow('Email already registered');

        expect(invitations.consume).not.toHaveBeenCalled();
        expect(prisma.user.create).not.toHaveBeenCalled();
      });

      it('propagates the invitation error unchanged (no user created)', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        invitations.consume.mockRejectedValue(
          new UnauthorizedException('Invitation expired'),
        );

        await expect(
          service.register(
            'Alice',
            'alice@example.com',
            'Passw0rd!',
            'invitation-token-abc',
          ),
        ).rejects.toThrow('Invitation expired');

        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.changeLog.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('login', () => {
    it('returns a token when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await service.login('alice@example.com', 'Passw0rd!');

      expect(bcrypt.compare).toHaveBeenCalledWith('Passw0rd!', 'hashed');
      expect(jwt.createToken).toHaveBeenCalledWith('user-1');
      expect(result.token).toBe('signed.jwt.token');
      expect(result.user.id).toBe('user-1');
    });

    it('throws "Invalid credentials" when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody@example.com', 'x')).rejects.toThrow(
        'Invalid credentials',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws "Invalid credentials" when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        service.login('alice@example.com', 'wrong'),
      ).rejects.toThrow('Invalid credentials');
      expect(jwt.createToken).not.toHaveBeenCalled();
    });

    it('throws "Account is deactivated" when password is correct but account is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      await expect(
        service.login('alice@example.com', 'Passw0rd!'),
      ).rejects.toThrow('Account is deactivated');
      expect(jwt.createToken).not.toHaveBeenCalled();
    });

    it('does not reveal account state when the password is wrong', async () => {
      // Wrong password + deactivated account must look identical to
      // wrong password + active account (both "Invalid credentials").
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false });
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        service.login('alice@example.com', 'wrong'),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
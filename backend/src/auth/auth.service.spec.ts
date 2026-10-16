import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtTokenService } from './jwt.service.js';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: Mock;
      create: Mock;
    };
  };
  let jwt: { createToken: Mock };

  const baseUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    role: 'USER',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };
    jwt = { createToken: vi.fn().mockReturnValue('signed.jwt.token') };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtTokenService,
    );
  });

  afterEach(() => vi.clearAllMocks());

  describe('register', () => {
    it('hashes the password, creates the user and returns a token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(baseUser);

      const result = await service.register('Alice', 'alice@example.com', 'Passw0rd!');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Passw0rd!', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Alice',
          email: 'alice@example.com',
          passwordHash: 'hashed',
        },
      });
      expect(jwt.createToken).toHaveBeenCalledWith('user-1');
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

    it('throws if the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.register('Alice', 'alice@example.com', 'Passw0rd!'),
      ).rejects.toThrow('Email already registered');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(jwt.createToken).not.toHaveBeenCalled();
    });

    it('never returns the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(baseUser);

      const result = await service.register('Alice', 'alice@example.com', 'Passw0rd!');

      expect(result.user).not.toHaveProperty('passwordHash');
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

    it('wraps Prisma errors in a generic message', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        service.login('alice@example.com', 'Passw0rd!'),
      ).rejects.toThrow('Oops, something went wrong');

      spy.mockRestore();
    });
  });
});

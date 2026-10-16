import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: Mock;
    login: Mock;
  };

  beforeEach(() => {
    authService = { register: vi.fn(), login: vi.fn() };
    controller = new AuthController(authService as unknown as AuthService);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  describe('register', () => {
    it('delegates to AuthService with the DTO fields', async () => {
      const payload = { token: 't', user: { id: '1' } };
      authService.register.mockResolvedValue(payload);

      const result = await controller.register({
        name: 'Alice',
        email: 'a@b.com',
        password: 'Passw0rd!',
      });

      expect(authService.register).toHaveBeenCalledWith(
        'Alice',
        'a@b.com',
        'Passw0rd!',
      );
      expect(result).toBe(payload);
    });

    it('wraps service errors in BadRequestException', async () => {
      authService.register.mockRejectedValue(new Error('Email already registered'));

      await expect(
        controller.register({ name: 'A', email: 'a@b.com', password: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login', () => {
    it('returns the service result on success', async () => {
      const payload = { token: 't', user: { id: '1' } };
      authService.login.mockResolvedValue(payload);

      await expect(
        controller.login({ email: 'a@b.com', password: 'x' }),
      ).resolves.toBe(payload);

      expect(authService.login).toHaveBeenCalledWith('a@b.com', 'x');
    });

    it('wraps service errors in UnauthorizedException', async () => {
      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        controller.login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
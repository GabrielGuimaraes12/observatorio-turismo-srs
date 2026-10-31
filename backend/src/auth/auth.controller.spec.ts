import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
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
  });

  afterEach(() => vi.restoreAllMocks());

  describe('register', () => {
    it('delegates to AuthService with name, email, password and no invitation token', async () => {
      const payload = { token: 't', user: { id: '1', role: 'USER' } };
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
        undefined,
      );
      expect(result).toBe(payload);
    });

    it('forwards the invitation token when present', async () => {
      const payload = { token: 't', user: { id: '1', role: 'ADMIN' } };
      authService.register.mockResolvedValue(payload);

      await controller.register({
        name: 'Alice',
        email: 'a@b.com',
        password: 'Passw0rd!',
        invitationToken: 'invite-abc',
      });

      expect(authService.register).toHaveBeenCalledWith(
        'Alice',
        'a@b.com',
        'Passw0rd!',
        'invite-abc',
      );
    });

    it('propagates service errors unchanged', async () => {
      const err = new ConflictException('Email already registered');
      authService.register.mockRejectedValue(err);

      await expect(
        controller.register({ name: 'Alice', email: 'a@b.com', password: 'Passw0rd!' }),
      ).rejects.toBe(err);
    });
  });

  describe('login', () => {
    it('delegates to AuthService with email and password', async () => {
      const payload = { token: 't', user: { id: '1' } };
      authService.login.mockResolvedValue(payload);

      const result = await controller.login({ email: 'a@b.com', password: 'x' });

      expect(authService.login).toHaveBeenCalledWith('a@b.com', 'x');
      expect(result).toBe(payload);
    });

    it('propagates service errors unchanged', async () => {
      const err = new UnauthorizedException('Invalid credentials');
      authService.login.mockRejectedValue(err);

      await expect(
        controller.login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toBe(err);
    });
  });
});
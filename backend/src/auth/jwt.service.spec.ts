import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtTokenService } from './jwt.service.js';

describe('JwtTokenService', () => {
  let nest: { sign: Mock; verify: Mock };
  let service: JwtTokenService;

  beforeEach(() => {
    nest = { sign: vi.fn(), verify: vi.fn() };
    service = new JwtTokenService(nest as unknown as NestJwtService);
  });

  it('createToken signs { sub: userId }', () => {
    nest.sign.mockReturnValue('token');
    expect(service.createToken('user-1')).toBe('token');
    expect(nest.sign).toHaveBeenCalledWith({ sub: 'user-1' });
  });

  it('getUserId returns the sub from a valid token', () => {
    nest.verify.mockReturnValue({ sub: 'user-1' });
    expect(service.getUserId('t')).toBe('user-1');
  });

  it('getUserId throws when sub is missing', () => {
    nest.verify.mockReturnValue({});
    expect(() => service.getUserId('t')).toThrow('Invalid or expired token');
  });

  it('getUserId throws when verify throws', () => {
    nest.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    expect(() => service.getUserId('t')).toThrow('Invalid or expired token');
  });
});
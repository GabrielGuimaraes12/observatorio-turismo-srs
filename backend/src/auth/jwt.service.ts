import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwt: NestJwtService) {}

  createToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  getUserId(token: string): string {
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      if (!payload.sub) throw new Error('Token missing sub');
      return payload.sub;
    } catch {
      throw new Error('Invalid or expired token');
    }
  }
}
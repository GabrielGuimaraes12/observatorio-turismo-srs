// src/auth/optional-jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtTokenService } from './jwt.service.js';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      return true; // anonymous — allow, request.user stays undefined
    }

    try {
      const userId = this.jwtTokenService.getUserId(
        authHeader.slice('Bearer '.length),
      );
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.isActive) {
        request.user = user; // enrich, but never throw
      }
    } catch {
      // invalid token on a public endpoint → treat as anonymous, don't 401
    }

    return true;
  }
}
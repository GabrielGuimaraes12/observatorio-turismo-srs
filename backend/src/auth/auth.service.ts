import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtTokenService } from './jwt.service.js';
import { InvitationService } from './invitation.service.js';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtTokenService,
    private readonly invitations: InvitationService,
  ) {}

  private serializeUser(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  private verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async register(
    name: string,
    email: string,
    password: string,
    invitationToken?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!invitationToken) {
      const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        throw new ConflictException('Email already registered');
      }

      const passwordHash = await this.hashPassword(password);
      const user = await this.prisma.user.create({
        data: { name, email: normalizedEmail, passwordHash, role: 'USER' },
      });

      const token = this.jwt.createToken(user.id);
      return { token, user: this.serializeUser(user) };
    }

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const { role } = await this.invitations.consume(invitationToken, normalizedEmail);

    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash, role },
    });

    await this.prisma.changeLog.create({
      data: {
        action: `register-${role.toLowerCase()}`,
        entity: 'User',
        entityId: user.id,
        userId: null,
      },
    });

    const token = this.jwt.createToken(user.id);
    return { token, user: this.serializeUser(user) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await this.verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwt.createToken(user.id);
    return { token, user: this.serializeUser(user) };
  }
}
import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const DEFAULT_TTL_HOURS = 72;

export type InvitableRole = 'HR' | 'ADMIN' | 'BUSINESS';

const INVITABLE_ROLES: readonly InvitableRole[] = ['HR', 'ADMIN', 'BUSINESS'];

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlHours(): number {
    const raw = process.env.INVITATION_TTL_HOURS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_HOURS;
  }

  isInvitableRole(role: string): role is InvitableRole {
    return (INVITABLE_ROLES as readonly string[]).includes(role);
  }

  /** Creates an invitation. Returns the plaintext token once; only its hash is stored. */
  async create(input: {
    email: string;
    role: InvitableRole;
    createdById: string | null;
  }) {
    if (!this.isInvitableRole(input.role)) {
      throw new ForbiddenException(`Role ${input.role} cannot be invited`);
    }

    const email = input.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const pending = await this.prisma.invitation.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ConflictException('An active invitation already exists for this email');
    }

    const plaintext = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.invitation.create({
      data: {
        tokenHash: this.hashToken(plaintext),
        email,
        role: input.role,
        expiresAt: new Date(Date.now() + this.ttlHours() * 3_600_000),
        createdById: input.createdById,
      },
    });

    if (input.createdById) {
      await this.prisma.changeLog.create({
        data: {
          action: `invite-${input.role.toLowerCase()}`,
          entity: 'Invitation',
          entityId: invitation.id,
          userId: input.createdById,
        },
      });
    }

    return {
      id: invitation.id,
      token: plaintext,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Atomically consumes an invitation. Returns the role it carried.
   * Throws if the token is invalid, expired, already used, or the email doesn't match.
   * A blank `email` on the invitation acts as a wildcard (bootstrap invitations).
   */
  async consume(plaintextToken: string, email: string): Promise<{ role: string; invitationId: string }> {
    const tokenHash = this.hashToken(plaintextToken);
    const normalizedEmail = email.trim().toLowerCase();

    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    if (!invitation) {
      throw new ForbiddenException('Invalid invitation token');
    }
    if (invitation.usedAt) {
      throw new ForbiddenException('Invitation already used');
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Invitation expired');
    }
    if (invitation.email !== '' && invitation.email !== normalizedEmail) {
      throw new ForbiddenException('Invitation does not match this email');
    }

    const consumed = await this.prisma.invitation.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new ForbiddenException('Invitation already used');
    }

    return { role: invitation.role, invitationId: invitation.id };
  }

  async listFor(createdById: string) {
    return this.prisma.invitation.findMany({
      where: {
        createdById,
        usedAt: null,
        expiresAt: { gt: new Date() },
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
  }

  async revoke(id: string, requesterId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.usedAt) {
      throw new NotFoundException('Invitation not found or already used');
    }
    if (invitation.createdById && invitation.createdById !== requesterId) {
      throw new ForbiddenException('You can only revoke invitations you created');
    }
    await this.prisma.invitation.delete({ where: { id } });
    await this.prisma.changeLog.create({
      data: {
        action: 'revoke-invitation',
        entity: 'Invitation',
        entityId: id,
        userId: requesterId,
      },
    });
    return { success: true, id };
  }
}
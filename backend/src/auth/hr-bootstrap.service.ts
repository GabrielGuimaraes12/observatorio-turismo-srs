import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const BOOTSTRAP_TTL_HOURS = 168; // 7 days

@Injectable()
export class HrBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger('HrBootstrap');

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const existingHr = await this.prisma.user.findFirst({ where: { role: 'HR' } });
    if (existingHr) return;

    const pending = await this.prisma.invitation.findFirst({
      where: { role: 'HR', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) {
      this.logger.warn(
        'No HR account exists, but a bootstrap invitation is already pending. ' +
        'If you did not save its token, wait for it to expire or delete the row ' +
        'manually and restart.',
      );
      return;
    }

    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    const expiresAt = new Date(Date.now() + BOOTSTRAP_TTL_HOURS * 3_600_000);

    await this.prisma.invitation.create({
      data: {
        tokenHash,
        email: '',
        role: 'HR',
        expiresAt,
      },
    });

    this.logger.warn(
      '\n' +
      '══════════════════════════════════════════════════════════════\n' +
      '  HR BOOTSTRAP TOKEN\n' +
      `  ${plaintext}\n` +
      '\n' +
      '  Use this as the invitation token on the register form to\n' +
      '  create the first HR account. Single-use.\n' +
      `  Expires: ${expiresAt.toISOString()}\n` +
      '══════════════════════════════════════════════════════════════\n',
    );
  }
}
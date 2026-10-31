import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface Requester {
  id: string;
  role: string;
}

const BUSINESS_OR_USER = ['BUSINESS', 'USER'] as const;

const listSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listFor(requesterRole: string, targetRole: string) {
		if (requesterRole === 'HR') {
			return this.prisma.user.findMany({
				where: { role: targetRole },
				orderBy: { createdAt: 'desc' },
				select: listSelect,
			});
		}
	
		if (requesterRole === 'ADMIN') {
			if (!BUSINESS_OR_USER.includes(targetRole as (typeof BUSINESS_OR_USER)[number])) {
				throw new ForbiddenException('Admins can only list BUSINESS or USER accounts');
			}
			return this.prisma.user.findMany({
				where: { role: targetRole },
				orderBy: { createdAt: 'desc' },
				select: listSelect,
			});
		}
	
		throw new ForbiddenException('Insufficient role');
	}

  async deactivate(targetId: string, requester: Requester) {
    if (targetId === requester.id) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User not found');

    this.assertRequesterCanManageTarget(requester, target.role);

    if (!target.isActive) throw new ConflictException('User is already deactivated');

    await this.assertNotLastActiveHr(target);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetId },
        data: { isActive: false },
      });
      await tx.changeLog.create({
        data: {
          action: 'deactivate-user',
          entity: 'User',
          entityId: targetId,
          userId: requester.id,
        },
      });
    });

    return { success: true, id: targetId };
  }

  async reactivate(targetId: string, requester: Requester) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('User not found');

    this.assertRequesterCanManageTarget(requester, target.role);

    if (target.isActive) throw new ConflictException('User is already active');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetId },
        data: { isActive: true },
      });
      await tx.changeLog.create({
        data: {
          action: 'reactivate-user',
          entity: 'User',
          entityId: targetId,
          userId: requester.id,
        },
      });
    });

    return { success: true, id: targetId };
  }

  private assertRequesterCanManageTarget(requester: Requester, targetRole: string) {
    if (requester.role === 'HR') return;

    if (requester.role === 'ADMIN') {
      if (!BUSINESS_OR_USER.includes(targetRole as (typeof BUSINESS_OR_USER)[number])) {
        throw new ForbiddenException(
          'Admins can only manage BUSINESS or USER accounts',
        );
      }
      return;
    }

    throw new ForbiddenException('Insufficient role');
  }

  private async assertNotLastActiveHr(target: {
    role: string;
    isActive: boolean;
    id: string;
  }) {
    if (target.role !== 'HR' || !target.isActive) return;

    const otherActiveHrs = await this.prisma.user.count({
      where: { role: 'HR', isActive: true, id: { not: target.id } },
    });

    if (otherActiveHrs === 0) {
      throw new ConflictException('Cannot deactivate the last active HR');
    }
  }
}
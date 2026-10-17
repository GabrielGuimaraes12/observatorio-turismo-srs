import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePeriodDto } from './create-periods.dto.js';
import { UpdatePeriodDto } from './update-periods.dto.js';

@Injectable()
export class PeriodService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.period.findMany({
      orderBy: { createdAt: 'desc' },
      include: { indicators: true, reports: true },
    });
  }

  async findOne(id: string) {
    const period = await this.prisma.period.findUnique({
      where: { id },
      include: { indicators: true, reports: true },
    });
    if (!period) throw new NotFoundException(`Period ${id} not found`);
    return period;
  }

  async create(dto: CreatePeriodDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.period.create({
      data: {
        name: dto.name,
        startDate,
        endDate,
      },
      include: { indicators: true, reports: true },
    });
  }

  async update(id: string, dto: UpdatePeriodDto) {
    await this.findOne(id); 

    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.period.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
      include: { indicators: true, reports: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.period.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ConflictException(
          'Period has related indicators/reports and cannot be deleted',
        );
      }
      throw e;
    }
    return { success: true, id };
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIndicatorDto } from './create-indicators.dto.js';
import { UpdateIndicatorDto } from './update-indicators.dto.js';

function generatePeriodName(startDate: Date, endDate: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return `${formatter.format(startDate)} a ${formatter.format(endDate)}`;
}

@Injectable()
export class IndicatorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.indicator.findMany({
      orderBy: { createdAt: 'desc' },
      include: { sector: true, period: true },
    });
  }

  async findPublished() {
    return this.prisma.indicator.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: { sector: true, period: true },
    });
  }

  async findOne(id: string) {
    const indicator = await this.prisma.indicator.findUnique({
      where: { id },
      include: { sector: true, period: true },
    });

    if (!indicator) {
      throw new NotFoundException(`Indicator ${id} not found`);
    }

    return indicator;
  }

  async create(dto: CreateIndicatorDto) {
    const startDate = new Date(dto.period.startDate);
    const endDate = new Date(dto.period.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException(
        'A data inicial deve ser anterior à data final.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const period = await tx.period.upsert({
        where: {
          startDate_endDate: { startDate, endDate },
        },
        update: {},
        create: {
          name: generatePeriodName(startDate, endDate),
          startDate,
          endDate,
        },
      });

      return tx.indicator.create({
        data: {
          name: dto.name,
          description: dto.description,
          value: dto.value,
          unit: dto.unit,
          published: dto.published ?? false,
          sectorId: dto.sectorId,
          periodId: period.id,
        },
        include: { sector: true, period: true },
      });
    });
  }

  async update(id: string, dto: UpdateIndicatorDto) {
    await this.findOne(id);

    const { period, ...indicatorData } = dto;

    if (period) {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException(
          'A data inicial deve ser anterior à data final.',
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const existingPeriod = await tx.period.upsert({
          where: {
            startDate_endDate: { startDate, endDate },
          },
          update: {},
          create: {
            name: generatePeriodName(startDate, endDate),
            startDate,
            endDate,
          },
        });

        return tx.indicator.update({
          where: { id },
          data: {
            ...indicatorData,
            periodId: existingPeriod.id,
          },
          include: { sector: true, period: true },
        });
      });
    }

    return this.prisma.indicator.update({
      where: { id },
      data: indicatorData,
      include: { sector: true, period: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.indicator.delete({ where: { id } });
    return { success: true, id };
  }
}

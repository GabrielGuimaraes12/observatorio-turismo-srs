import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIndicatorDto } from './create-indicators.dto.js';
import { UpdateIndicatorDto } from './update-indicators.dto.js';

@Injectable()
export class IndicatorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.indicator.findMany({
      orderBy: { createdAt: 'desc' },
      include: { sector: true, period: true },
    });
  }

  async findOne(id: string) {
    const indicator = await this.prisma.indicator.findUnique({
      where: { id },
      include: { sector: true, period: true },
    });
    if (!indicator) throw new NotFoundException(`Indicator ${id} not found`);
    return indicator;
  }

  async create(dto: CreateIndicatorDto) {
    return this.prisma.indicator.create({
      data: {
        name: dto.name,
        description: dto.description,
        value: dto.value,
        unit: dto.unit,
        published: dto.published ?? false,
        sectorId: dto.sectorId,
        periodId: dto.periodId,
      },
      include: { sector: true, period: true },
    });
  }

  async update(id: string, dto: UpdateIndicatorDto) {
    await this.findOne(id); 
    return this.prisma.indicator.update({
      where: { id },
      data: dto,
      include: { sector: true, period: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.indicator.delete({ where: { id } });
    return { success: true, id };
  }
}
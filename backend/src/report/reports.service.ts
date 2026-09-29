import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReportDto } from './create-report.dto.js';
import { UpdateReportDto } from './update-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { period: true },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { period: true },
    });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return report;
  }

  async create(dto: CreateReportDto) {
    return this.prisma.report.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileUrl: dto.fileUrl,
        published: dto.published ?? false,
        periodId: dto.periodId,
      },
      include: { period: true },
    });
  }

  async update(id: string, dto: UpdateReportDto) {
    await this.findOne(id); // throws 404 if missing
    return this.prisma.report.update({
      where: { id },
      data: dto,
      include: { period: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.report.delete({ where: { id } });
    return { success: true, id };
  }
}
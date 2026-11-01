import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Report } from '../generated/prisma/client.js';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  save(data: Prisma.ReportUncheckedCreateInput): Promise<Report> {
    return this.prisma.report.create({ data });
  }

  findById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({ where: { id } });
  }

  update(id: string, patch: Partial<Report>): Promise<Report> {
    return this.prisma.report.update({ where: { id }, data: patch });
  }
}
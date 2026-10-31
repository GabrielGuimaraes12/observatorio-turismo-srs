import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReportDto } from './create-report.dto.js';
import { UpdateReportDto } from './update-report.dto.js';

interface Requester {
  id: string;
  role: string;
}

const reportInclude = {
  period: true,
  sector: true,
  author: {
    select: { id: true, name: true, email: true },
  },
} as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(requester?: Requester) {
    // Visibility:
    // - Anonymous / USER / ADMIN / HR → published only
    // - BUSINESS → published + their own drafts
    let where: Record<string, unknown> = { published: true };

    if (requester?.role === 'BUSINESS') {
      where = {
        OR: [
          { published: true },
          { authorId: requester.id, published: false },
        ],
      };
    }

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });
  }

  async findOne(id: string, requester?: Requester) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: reportInclude,
    });

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    if (report.published) {
      return report; // published reports are always visible
    }

    const isAuthor =
      requester?.role === 'BUSINESS' && report.authorId === requester.id;

    if (!isAuthor) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return report;
  }

  async create(dto: CreateReportDto, authorId: string) {
    return this.prisma.report.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileUrl: dto.fileUrl,
        published: dto.published ?? false,
        periodId: dto.periodId,
        authorId: authorId,
      },
      include: reportInclude,
    });
  }

  async update(id: string, dto: UpdateReportDto) {
    await this.findOne(id);
    return this.prisma.report.update({
      where: { id },
      data: Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ),
      include: reportInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.report.delete({ where: { id } });
    return { success: true, id };
  }
}
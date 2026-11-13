import { BadRequestException,
  Injectable,
  NotFoundException } from '@nestjs/common';
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
    // - Anonymous / USER / HR → published only
    // - ADMIN → all reports
    // - BUSINESS → published + their own drafts
    let where: Record<string, unknown> = { published: true };

    if (requester?.role === 'ADMIN') {
      where = {};
    } else if (requester?.role === 'BUSINESS') {
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

    if (report.published || requester?.role === 'ADMIN') {
      return report;
    }

    const isAuthor =
      requester?.role === 'BUSINESS' && report.authorId === requester.id;

    if (!isAuthor) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return report;
  }

  async create(dto: CreateReportDto, authorId: string, fileUrl: string) {
    return this.prisma.$transaction(async (tx) => {
      let periodId: string | null = null;

      if (dto.period) {
        const startDate = new Date(dto.period.startDate);
        const endDate = new Date(dto.period.endDate);

        if (startDate >= endDate) {
          throw new BadRequestException('A data inicial deve ser anterior à data final.',);
        }

        const periodName = new Intl.DateTimeFormat('pt-BR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        const name = `${periodName.format(startDate)} a ${periodName.format(endDate)}`;

        const period = await tx.period.upsert({
          where: {
            startDate_endDate: {
              startDate,
              endDate,
            },
          },
          update: {},
          create: {
            name,
            startDate,
            endDate,
          },
        });

        periodId = period.id;
      }

      return tx.report.create({
        data: {
          title: dto.title,
          description: dto.description,
          fileUrl: fileUrl,
          published: dto.published ?? false,
          periodId,
          sectorId: dto.sectorId,
          authorId,
        },
        include: reportInclude,
      });
    });
  }
  async update(id: string, dto: UpdateReportDto, requester?: Requester, fileUrl?: string) {
    await this.findOne(id, requester);

    return this.prisma.$transaction(async (tx) => {
      const { period, ...reportData } = dto;

      let periodId: string | undefined;

      if (period) {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);

        if (startDate >= endDate) {
          throw new BadRequestException(
            'A data inicial deve ser anterior à data final.',
          );
        }

        const formatter = new Intl.DateTimeFormat('pt-BR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        const name = `${formatter.format(startDate)} a ${formatter.format(endDate)}`;

        const existingPeriod = await tx.period.upsert({
          where: {
            startDate_endDate: {
              startDate,
              endDate,
            },
          },
          update: {},
          create: {
            name,
            startDate,
            endDate,
          },
        });

        periodId = existingPeriod.id;
      }

      return tx.report.update({
        where: { id },
        data: {
          ...Object.fromEntries(
            Object.entries(reportData).filter(([, value]) => value !== undefined),
          ),
          ...(periodId !== undefined ? { periodId } : {}),
          ...(fileUrl !== undefined ? { fileUrl } : {}),
        },
        include: reportInclude,
      });
    });
  }

  async remove(id: string, requester?: Requester) {
    await this.findOne(id, requester);
    await this.prisma.report.delete({ where: { id } });
    return { success: true, id };
  }

  async isFileUsedByAnotherReport(
    fileUrl: string,
    reportId: string,
  ): Promise<boolean> {
    const count = await this.prisma.report.count({
      where: {
        fileUrl,
        id: { not: reportId },
      },
    });

    return count > 0;
  }
}
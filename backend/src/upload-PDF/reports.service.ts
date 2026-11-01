import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { CreateReportDto } from './create-report.dto.js';
import { UpdateReportDto } from './update-report.dto.js';
import { Report } from '../generated/prisma/client.js';
import { ReportRepository } from './report.repository.js';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'pdfs');

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportRepository) {}

  async createFromFile(file: Express.Multer.File): Promise<Report> {
  try {
    return await this.repo.save({
      title: file.originalname.replace(/\.pdf$/i, ''),
      description: null,
      published: false,
      fileUrl: file.filename,
      periodId: null,
    });
  } catch (err) {
    await unlink(join(UPLOAD_DIR, file.filename)).catch(() => void 0);
    throw err;
  }
}

  async create(dto: CreateReportDto, file: Express.Multer.File): Promise<Report> {
    try {
      return await this.repo.save({
        title: dto.title ?? file.originalname.replace(/\.pdf$/i, ''),
        description: dto.description ?? null,
        published: dto.isPublished ?? false,
        fileUrl: file.filename,
        periodId: dto.periodId ?? null,
      });
    } catch (err) {
      await unlink(join(UPLOAD_DIR, file.filename)).catch(() => void 0);
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateReportDto,
    file?: Express.Multer.File,
  ): Promise<Report> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Relatório não encontrado.');

    const patch: Partial<Report> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.isPublished !== undefined) patch.published = dto.isPublished;

    if (file) {
      patch.fileUrl = file.filename;
      await unlink(join(UPLOAD_DIR, existing.fileUrl)).catch(() => void 0);
    }

    return this.repo.update(id, patch);
  }

  async findById(id: string): Promise<Report | null> {
    return this.repo.findById(id);
  }

  resolvePdfPath(filename: string): string {
    return join(UPLOAD_DIR, filename);
  }
}
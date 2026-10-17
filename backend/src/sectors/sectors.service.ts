import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSectorDto } from './create-sectors.dto.js';
import { UpdateSectorDto } from './update-sectors.dto.js';

@Injectable()
export class SectorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sector.findMany({
      orderBy: { createdAt: 'desc' },
      include: { indicators: true },
    });
  }

  async findOne(id: string) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      include: { indicators: true },
    });
    if (!sector) throw new NotFoundException(`Sector ${id} not found`);
    return sector;
  }

  async create(dto: CreateSectorDto) {
    try {
      return await this.prisma.sector.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
        include: { indicators: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Sector name already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateSectorDto) {
    await this.findOne(id); 

    try {
      return await this.prisma.sector.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
        include: { indicators: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Sector name already exists');
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.sector.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ConflictException(
          'Sector has related indicators and cannot be deleted',
        );
      }
      throw e;
    }
    return { success: true, id };
  }
}
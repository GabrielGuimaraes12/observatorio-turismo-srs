
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndicatorService } from './indicators.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('IndicatorService - Public indicators', () => {
  const findMany = vi.fn();

  const prisma = {
    indicator: {
      findMany,
    },
  };

  let service: IndicatorService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new IndicatorService(
      prisma as unknown as PrismaService,
    );
  });

  it('returns only published indicators', async () => {
    const publishedIndicators = [
      {
        id: 'indicator-1',
        name: 'Ocupação hoteleira',
        value: 68,
        unit: '%',
        published: true,
      },
    ];

    findMany.mockResolvedValue(publishedIndicators);

    const result = await service.findPublished();

    expect(result).toEqual(publishedIndicators);

    expect(findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: {
        sector: true,
        period: true,
      },
    });
  });

  it('returns an empty array when no indicators are published', async () => {
    findMany.mockResolvedValue([]);

    const result = await service.findPublished();

    expect(result).toEqual([]);
  });
});

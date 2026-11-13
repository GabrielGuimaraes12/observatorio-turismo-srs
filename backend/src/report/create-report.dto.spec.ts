import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto.js';
import 'reflect-metadata';

const validateDto = (data: unknown) => {
  const dto = plainToInstance(CreateReportDto, data);
  return validate(dto);
};

describe('CreateReportDto', () => {
  const valid = {
    title: 'Annual report',
  };

  it('accepts the minimal valid payload', async () => {
    expect(await validateDto(valid)).toHaveLength(0);
  });

  it('accepts all optional fields populated', async () => {
    const errors = await validateDto({
      ...valid,
      description: 'A description',
      published: true,
      period: {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      sectorId: '11111111-1111-4111-8111-111111111111',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects when title is missing', async () => {
    const errors = await validateDto({});
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects an empty title', async () => {
    const errors = await validateDto({ ...valid, title: '' });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects a title longer than 255 chars', async () => {
    const errors = await validateDto({
      ...valid,
      title: 'a'.repeat(256),
    });

    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects a non-string title', async () => {
    const errors = await validateDto({ ...valid, title: 42 });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects non-boolean published', async () => {
    const errors = await validateDto({
      ...valid,
      published: 'yes',
    });

    expect(errors.some((e) => e.property === 'published')).toBe(true);
  });

  it('accepts a valid period with startDate and endDate', async () => {
    const errors = await validateDto({
      ...valid,
      period: {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    });

    expect(errors.some((e) => e.property === 'period')).toBe(false);
  });

  it('rejects an invalid period date', async () => {
    const errors = await validateDto({
      ...valid,
      period: {
        startDate: 'invalid-date',
        endDate: '2026-12-31',
      },
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid sectorId', async () => {
    const errors = await validateDto({
      ...valid,
      sectorId: 'invalid-id',
    });

    expect(errors.some((e) => e.property === 'sectorId')).toBe(true);
  });

  it('ignores unknown properties only when whitelist+forbidNonWhitelisted are enabled', async () => {
    const dto = plainToInstance(CreateReportDto, {
      ...valid,
      malicious: 'x',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect((dto as any).malicious).toBe('x');
  });
});

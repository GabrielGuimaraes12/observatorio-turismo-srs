import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto.js';

const validateDto = (data: unknown) => {
  const dto = plainToInstance(CreateReportDto, data);
  return validate(dto);
};

describe('CreateReportDto', () => {
  const valid = {
    title: 'Annual report',
    fileUrl: 'https://cdn.example.com/report.pdf',
  };

  it('accepts the minimal valid payload', async () => {
    expect(await validateDto(valid)).toHaveLength(0);
  });

  it('accepts all optional fields populated', async () => {
    const errors = await validateDto({
      ...valid,
      description: 'A description',
      published: true,
      periodId: '11111111-1111-4111-8111-111111111111',
    });
    expect(errors).toHaveLength(0);
  });

  it.each([
    ['title', { fileUrl: valid.fileUrl }],
    ['fileUrl', { title: valid.title }],
  ])('rejects when %s is missing', async (_label, payload) => {
    const errors = await validateDto(payload);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an empty title', async () => {
    const errors = await validateDto({ ...valid, title: '' });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects a title longer than 255 chars', async () => {
    const errors = await validateDto({ ...valid, title: 'a'.repeat(256) });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects an empty fileUrl', async () => {
    const errors = await validateDto({ ...valid, fileUrl: '' });
    expect(errors.some((e) => e.property === 'fileUrl')).toBe(true);
  });

  it('rejects a non-string title', async () => {
    const errors = await validateDto({ ...valid, title: 42 });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects non-boolean published', async () => {
    const errors = await validateDto({ ...valid, published: 'yes' });
    expect(errors.some((e) => e.property === 'published')).toBe(true);
  });

  it('rejects a non-UUID periodId', async () => {
    const errors = await validateDto({ ...valid, periodId: 'not-a-uuid' });
    expect(errors.some((e) => e.property === 'periodId')).toBe(true);
  });

  it('accepts a valid UUID periodId', async () => {
    const errors = await validateDto({
      ...valid,
      periodId: '11111111-1111-4111-8111-111111111111',
    });
    expect(errors).toHaveLength(0);
  });

  it('ignores unknown properties only when whitelist+forbidNonWhitelisted are enabled', async () => {
    // By default, class-validator does NOT strip unknown props;
    // the ValidationPipe in main.ts does. This test proves that here.
    const dto = plainToInstance(CreateReportDto, {
      ...valid,
      malicious: 'x',
    });
    const errors = await validate(dto);
    // The DTO itself still validates — the pipe is what rejects extras.
    expect(errors).toHaveLength(0);
    expect((dto as any).malicious).toBe('x');
  });
});
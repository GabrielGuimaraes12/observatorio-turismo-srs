import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateReportDto } from './update-report.dto.js';

const validateDto = (data: unknown) => {
  const dto = plainToInstance(UpdateReportDto, data);
  return validate(dto);
};

describe('UpdateReportDto', () => {
  it('accepts an empty object (all fields optional)', async () => {
    expect(await validateDto({})).toHaveLength(0);
  });

  it('accepts a single field', async () => {
    expect(await validateDto({ title: 'Renamed' })).toHaveLength(0);
  });

  it('accepts all fields together', async () => {
    const errors = await validateDto({
      title: 'Renamed',
      description: 'New description',
      fileUrl: 'https://cdn.example.com/new.pdf',
      published: false,
      periodId: '11111111-1111-4111-8111-111111111111',
    });
    expect(errors).toHaveLength(0);
  });

  // Validators from CreateReportDto must still apply when a field is present.
  it('still rejects a title longer than 255 chars', async () => {
    const errors = await validateDto({ title: 'a'.repeat(256) });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('still rejects an empty title when provided', async () => {
    const errors = await validateDto({ title: '' });
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('still rejects an empty fileUrl when provided', async () => {
    const errors = await validateDto({ fileUrl: '' });
    expect(errors.some((e) => e.property === 'fileUrl')).toBe(true);
  });

  it('still rejects a non-UUID periodId when provided', async () => {
    const errors = await validateDto({ periodId: 'nope' });
    expect(errors.some((e) => e.property === 'periodId')).toBe(true);
  });

  it('still rejects a non-boolean published when provided', async () => {
    const errors = await validateDto({ published: 'true' });
    expect(errors.some((e) => e.property === 'published')).toBe(true);
  });
});
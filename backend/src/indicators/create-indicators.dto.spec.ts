import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateIndicatorDto,
  IndicatorPeriodDto,
} from './create-indicators.dto.js';

const validPayload = () => ({
  name: 'Inflação',
  description: 'IPCA',
  value: 4.5,
  unit: '%',
  published: true,
  sectorId: '11111111-1111-4111-8111-111111111111',
  period: { startDate: '2024-01-01', endDate: '2024-12-31' },
});

const errorsOf = async (payload: unknown) => {
  const dto = plainToInstance(CreateIndicatorDto, payload);
  return validate(dto as object);
};

describe('IndicatorPeriodDto', () => {
  it('accepts valid ISO date strings', async () => {
    const dto = plainToInstance(IndicatorPeriodDto, {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects non-date strings on both fields', async () => {
    const dto = plainToInstance(IndicatorPeriodDto, {
      startDate: 'not-a-date',
      endDate: 'also-not',
    });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property).sort()).toEqual([
      'endDate',
      'startDate',
    ]);
  });

  it('rejects missing date fields', async () => {
    const dto = plainToInstance(IndicatorPeriodDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(2);
  });
});

describe('CreateIndicatorDto', () => {
  it('accepts a fully valid payload', async () => {
    expect(await errorsOf(validPayload())).toHaveLength(0);
  });

  it('accepts a minimal payload (optional fields omitted)', async () => {
    const { name, value, sectorId, period } = validPayload();
    expect(
      await errorsOf({ name, value, sectorId, period }),
    ).toHaveLength(0);
  });

  describe('name', () => {
    it('rejects missing name', async () => {
      const { name, ...rest } = validPayload();
      const errors = await errorsOf(rest);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('rejects an empty string', async () => {
      const errors = await errorsOf({ ...validPayload(), name: '' });
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('rejects a name over 255 chars', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        name: 'a'.repeat(256),
      });
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('accepts a name of exactly 255 chars', async () => {
      expect(
        await errorsOf({ ...validPayload(), name: 'a'.repeat(255) }),
      ).toHaveLength(0);
    });
  });

  describe('description', () => {
    it('rejects a description over 500 chars', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        description: 'a'.repeat(501),
      });
      expect(errors.some((e) => e.property === 'description')).toBe(true);
    });

    it('accepts a description of exactly 500 chars', async () => {
      expect(
        await errorsOf({ ...validPayload(), description: 'a'.repeat(500) }),
      ).toHaveLength(0);
    });
  });

  describe('value', () => {
    it('rejects a negative value', async () => {
      const errors = await errorsOf({ ...validPayload(), value: -0.01 });
      expect(errors.some((e) => e.property === 'value')).toBe(true);
    });

    it('accepts zero', async () => {
      expect(await errorsOf({ ...validPayload(), value: 0 })).toHaveLength(0);
    });

    it('rejects a numeric string', async () => {
      const errors = await errorsOf({ ...validPayload(), value: '4.5' });
      expect(errors.some((e) => e.property === 'value')).toBe(true);
    });

    it('rejects a missing value', async () => {
      const { value, ...rest } = validPayload();
      const errors = await errorsOf(rest);
      expect(errors.some((e) => e.property === 'value')).toBe(true);
    });
  });

  describe('unit', () => {
    it('rejects a unit over 20 chars', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        unit: 'a'.repeat(21),
      });
      expect(errors.some((e) => e.property === 'unit')).toBe(true);
    });

    it('accepts a unit of exactly 20 chars', async () => {
      expect(
        await errorsOf({ ...validPayload(), unit: 'a'.repeat(20) }),
      ).toHaveLength(0);
    });
  });

  describe('published', () => {
    it('rejects a string value', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        published: 'true',
      });
      expect(errors.some((e) => e.property === 'published')).toBe(true);
    });

    it('accepts false', async () => {
      expect(
        await errorsOf({ ...validPayload(), published: false }),
      ).toHaveLength(0);
    });
  });

  describe('sectorId', () => {
    it('rejects a non-UUID string', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        sectorId: 'not-a-uuid',
      });
      expect(errors.some((e) => e.property === 'sectorId')).toBe(true);
    });

    it('rejects a v1 UUID (restricted to v4)', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        sectorId: '11111111-1111-1111-8111-111111111111',
      });
      expect(errors.some((e) => e.property === 'sectorId')).toBe(true);
    });

    it('rejects a missing sectorId', async () => {
      const { sectorId, ...rest } = validPayload();
      const errors = await errorsOf(rest);
      expect(errors.some((e) => e.property === 'sectorId')).toBe(true);
    });
  });

  describe('period (nested)', () => {
    it('propagates nested validation errors', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        period: { startDate: 'nope', endDate: 'nope' },
      });
      const periodError = errors.find((e) => e.property === 'period');
      expect(periodError).toBeDefined();
      expect(
        periodError?.children?.map((c) => c.property).sort(),
      ).toEqual(['endDate', 'startDate']);
    });

    it('rejects a period sent as a plain string', async () => {
      const errors = await errorsOf({
        ...validPayload(),
        period: '{"startDate":"2024-01-01","endDate":"2024-12-31"}',
      });
      expect(errors.some((e) => e.property === 'period')).toBe(true);
    });
  });

  it('collects every error when multiple fields are invalid', async () => {
    const errors = await errorsOf({
      name: '',
      value: -1,
      sectorId: 'nope',
      period: { startDate: 'x', endDate: 'y' },
    });
    const props = errors.map((e) => e.property).sort();
    expect(props).toEqual(
      expect.arrayContaining(['name', 'value', 'sectorId', 'period']),
    );
  });
});
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSectorDto } from './create-sectors.dto.js';

const errorsOf = async (payload: unknown) => {
  const dto = plainToInstance(CreateSectorDto, payload);
  return validate(dto as object);
};

describe('CreateSectorDto', () => {
  it('accepts a valid name', async () => {
    expect(await errorsOf({ name: 'Turismo' })).toHaveLength(0);
  });

  it('accepts name with optional description', async () => {
    expect(
      await errorsOf({ name: 'Turismo', description: 'Setor de turismo' }),
    ).toHaveLength(0);
  });

  it('rejects missing name', async () => {
    const errors = await errorsOf({});
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects empty name', async () => {
    const errors = await errorsOf({ name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects name over 255 chars', async () => {
    const errors = await errorsOf({ name: 'a'.repeat(256) });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('accepts name of exactly 255 chars', async () => {
    expect(await errorsOf({ name: 'a'.repeat(255) })).toHaveLength(0);
  });

  it('rejects non-string description', async () => {
    const errors = await errorsOf({ name: 'Turismo', description: 123 });
    expect(errors.some((e) => e.property === 'description')).toBe(true);
  });
});
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';

const validateDto = async <T extends object>(cls: new () => T, data: Partial<T>) => {
  const dto = plainToInstance(cls, data);
  return validate(dto);
};

describe('UserCreateDto', () => {
  const valid = {
    name: 'Alice',
    email: 'alice@example.com',
    password: 'Passw0rd!',
  };

  it('accepts a valid payload', async () => {
    expect(await validateDto(UserCreateDto, valid)).toHaveLength(0);
  });

  it.each([
    ['name too short', { ...valid, name: 'A' }],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['password too short', { ...valid, password: 'Aa1!' }],
    ['missing uppercase', { ...valid, password: 'passw0rd!' }],
    ['missing digit', { ...valid, password: 'Password!' }],
    ['missing special char', { ...valid, password: 'Passw0rd' }],
  ])('rejects %s', async (_label, payload) => {
    const errors = await validateDto(UserCreateDto, payload);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UserLoginDto', () => {
  it('accepts valid credentials', async () => {
    expect(
      await validateDto(UserLoginDto, {
        email: 'a@b.com',
        password: 'anything',
      }),
    ).toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const errors = await validateDto(UserLoginDto, {
      email: 'nope',
      password: 'x',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register returns a token and a sanitized user', async () => {
    const email = `e2e-${Date.now()}@example.com`;

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Alice', email, password: 'Passw0rd!' })
      .expect(201);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, name: 'Alice' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('POST /api/auth/register rejects a weak password with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Bob', email: `weak-${Date.now()}@example.com`, password: 'weak' })
      .expect(400);
  });

  it('POST /api/auth/login rejects bad credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' })
      .expect(401);
  });
});

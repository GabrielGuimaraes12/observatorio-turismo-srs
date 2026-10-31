import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  const createdUserIds: string[] = [];

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  // ── POST /api/auth/register ──────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('returns 201 with a token and a sanitized user (role USER)', async () => {
      const email = uniqueEmail('reg');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email, password: 'Passw0rd!' })
        .expect(201);

      createdUserIds.push(res.body.user.id);

      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ name: 'Alice', email, role: 'USER' });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('returns 409 when the email is already registered', async () => {
      const email = uniqueEmail('dup');

      const first = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email, password: 'Passw0rd!' })
        .expect(201);
      createdUserIds.push(first.body.user.id);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Bob', email, password: 'Passw0rd!' })
        .expect(409);
    });

    it('returns 400 when the name is too short', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'A', email: uniqueEmail('n'), password: 'Passw0rd!' })
        .expect(400);
    });

    it('returns 400 when the password lacks uppercase', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email: uniqueEmail('p'), password: 'passw0rd!' })
        .expect(400);
    });

    it('returns 400 when the password lacks a digit', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email: uniqueEmail('p'), password: 'Password!' })
        .expect(400);
    });

    it('returns 400 when the password lacks a special character', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email: uniqueEmail('p'), password: 'Passw0rd' })
        .expect(400);
    });

    it('returns 400 when the password is shorter than 8 chars', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email: uniqueEmail('p'), password: 'Aa1!' })
        .expect(400);
    });

    it('returns 400 for an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'not-an-email', password: 'Passw0rd!' })
        .expect(400);
    });

    it('returns 400 for an unknown property (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Alice',
          email: uniqueEmail('w'),
          password: 'Passw0rd!',
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  // ── POST /api/auth/login ─────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    const password = 'Passw0rd!';
    let email: string;

    beforeAll(async () => {
      email = uniqueEmail('login');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Login User', email, password })
        .expect(201);
      createdUserIds.push(res.body.user.id);
    });

    it('returns 200 with a token when credentials are valid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email, role: 'USER' });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('returns 401 when the user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: uniqueEmail('nobody'), password })
        .expect(401);
    });

    it('returns 401 when the password is wrong', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassw0rd!' })
        .expect(401);
    });

    it('returns 400 when the body is missing the password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email })
        .expect(400);
    });

    it('returns 400 when the email is not an email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nope', password })
        .expect(400);
    });
  });
});
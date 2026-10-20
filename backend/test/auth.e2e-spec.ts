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

  // ── PATCH /api/auth/promote/:id ──────────────────────────────────────────
  

describe('PATCH /api/auth/promote/:id', () => {
  let adminToken: string;
  let userToken: string;

  const registerUser = async (prefix: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: uniqueEmail(prefix),
        password: 'Passw0rd!',
      })
      .expect(201);

    createdUserIds.push(res.body.user.id);

    return res.body as {
      token: string;
      user: { id: string; role: string };
    };
  };

  beforeAll(async () => {
    const admin = await registerUser('admin');

    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'ADMIN' },
    });

    adminToken = admin.token;

    const regularUser = await registerUser('regular');
    userToken = regularUser.token;
  });

  it('returns 401 without a token', async () => {
    const target = await registerUser('no-token');

    await request(app.getHttpServer())
      .patch(`/api/auth/promote/${target.user.id}`)
      .expect(401);
  });

  it('returns 403 for a regular USER', async () => {
    const target = await registerUser('forbidden');

    await request(app.getHttpServer())
      .patch(`/api/auth/promote/${target.user.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('allows an ADMIN to promote a USER', async () => {
    const target = await registerUser('promote');

    expect(target.user.role).toBe('USER');

    const res = await request(app.getHttpServer())
      .patch(`/api/auth/promote/${target.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.role).toBe('ADMIN');

    const updated = await prisma.user.findUnique({
      where: { id: target.user.id },
    });

    expect(updated?.role).toBe('ADMIN');
  });

  it('returns 409 if the user is already ADMIN', async () => {
    const target = await registerUser('already-admin');

    await prisma.user.update({
      where: { id: target.user.id },
      data: { role: 'ADMIN' },
    });

    await request(app.getHttpServer())
      .patch(`/api/auth/promote/${target.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('returns 404 for a nonexistent user', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';

    await request(app.getHttpServer())
      .patch(`/api/auth/promote/${missing}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('returns 400 for an invalid UUID', async () => {
    await request(app.getHttpServer())
      .patch('/api/auth/promote/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});

});
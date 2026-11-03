import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Periods (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  let adminToken: string;
  let userToken: string;

  const createdPeriodIds: string[] = [];
  const createdUserIds: string[] = [];

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const register = async (name: string, email: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name, email, password: 'Passw0rd!' })
      .expect(201);
    createdUserIds.push(res.body.user.id);
    return res.body as { token: string; user: { id: string; role: string } };
  };

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

    const user = await register('Regular User', uniqueEmail('user'));
    userToken = user.token;

    const admin = await register('Admin User', uniqueEmail('admin'));

    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'ADMIN' },
    });

    const adminRow = await prisma.user.findUnique({ where: { id: admin.user.id } });
    expect(adminRow?.role).toBe('ADMIN');

    adminToken = admin.token;
  });

  afterAll(async () => {
    if (createdPeriodIds.length) {
      // remove dependências caso tenha sobrado algo
      await prisma.indicator.deleteMany({
        where: { periodId: { in: createdPeriodIds } },
      });
      await prisma.report.deleteMany({
        where: { periodId: { in: createdPeriodIds } },
      });
      await prisma.period.deleteMany({
        where: { id: { in: createdPeriodIds } },
      });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /api/periods
  // -------------------------------------------------------------------------
  describe('GET /api/periods', () => {
    it('returns 200 with an array (public, no auth)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/periods')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/periods/:id
  // -------------------------------------------------------------------------
  describe('GET /api/periods/:id', () => {
    it('returns 200 and the period (with indicators & reports arrays)', async () => {
      const created = await prisma.period.create({
        data: {
          name: `2024-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });
      createdPeriodIds.push(created.id);

      const res = await request(app.getHttpServer())
        .get(`/api/periods/${created.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(Array.isArray(res.body.indicators)).toBe(true);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('returns 404 when the period does not exist', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/periods/${missing}`)
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/periods/not-a-uuid')
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/periods
  // -------------------------------------------------------------------------
  describe('POST /api/periods', () => {
    const validPayload = () => ({
      name: `Q1-${Date.now()}`,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/api/periods')
        .send(validPayload())
        .expect(401);
    });

    it('returns 403 when the caller is not ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/periods')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload())
        .expect(403);
    });

    it('creates a period as ADMIN and returns 201', async () => {
      const payload = validPayload();

      const res = await request(app.getHttpServer())
        .post('/api/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      createdPeriodIds.push(res.body.id);

      expect(res.body).toMatchObject({ name: payload.name });
      expect(res.body.id).toEqual(expect.any(String));
      expect(new Date(res.body.startDate).toISOString()).toBe(
        new Date(payload.startDate).toISOString(),
      );
    });

    it('returns 400 when startDate >= endDate', async () => {
      await request(app.getHttpServer())
        .post('/api/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'inválido',
          startDate: '2026-04-01',
          endDate: '2026-01-01',
        })
        .expect(400);
    });

    it('returns 400 when startDate is not a valid date string', async () => {
      await request(app.getHttpServer())
        .post('/api/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'x', startDate: 'not-a-date', endDate: '2026-03-31' })
        .expect(400);
    });

    it('returns 400 when the body is invalid (missing name)', async () => {
      await request(app.getHttpServer())
        .post('/api/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ startDate: '2026-01-01', endDate: '2026-03-31' })
        .expect(400);
    });

    it('returns 400 when the body has an unknown property (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload(), malicious: 'nope' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/periods/:id
  // -------------------------------------------------------------------------
  describe('PATCH /api/periods/:id', () => {
    let periodId: string;

    beforeEach(async () => {
      const created = await prisma.period.create({
        data: {
          name: `ToUpdate-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });
      createdPeriodIds.push(created.id);
      periodId = created.id;
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/periods/${periodId}`)
        .send({ name: 'Renamed' })
        .expect(401);
    });

    it('returns 403 as a non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/periods/${periodId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Renamed' })
        .expect(403);
    });

    it('updates as ADMIN and returns the changed row', async () => {
      const newName = `Renamed-${Date.now()}`;

      const res = await request(app.getHttpServer())
        .patch(`/api/periods/${periodId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: newName })
        .expect(200);

      expect(res.body).toMatchObject({ id: periodId, name: newName });
    });

    it('returns 400 when startDate >= endDate on update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/periods/${periodId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ startDate: '2026-04-01', endDate: '2026-01-01' })
        .expect(400);
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/periods/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' })
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/periods/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/periods/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/periods/:id', () => {
    it('returns 401 without a token', async () => {
      const r = await prisma.period.create({
        data: {
          name: `Del-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });
      createdPeriodIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/periods/${r.id}`)
        .expect(401);

      const stillThere = await prisma.period.findUnique({ where: { id: r.id } });
      expect(stillThere).not.toBeNull();
    });

    it('returns 403 as a non-admin', async () => {
      const r = await prisma.period.create({
        data: {
          name: `Del-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });
      createdPeriodIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/periods/${r.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('deletes as ADMIN and returns { success, id }', async () => {
      const r = await prisma.period.create({
        data: {
          name: `Del-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/periods/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, id: r.id });

      const gone = await prisma.period.findUnique({ where: { id: r.id } });
      expect(gone).toBeNull();
    });

    it('returns 409 when period has related indicators/reports (P2003)', async () => {
      const period = await prisma.period.create({
        data: {
          name: `ComDep-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });
      const sector = await prisma.sector.create({
        data: { name: `sec-${Date.now()}` },
      });
      const indicator = await prisma.indicator.create({
        data: { name: 'Ind', value: 1, sectorId: sector.id, periodId: period.id },
      });

      await request(app.getHttpServer())
        .delete(`/api/periods/${period.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      // cleanup
      await prisma.indicator.delete({ where: { id: indicator.id } });
      await prisma.sector.delete({ where: { id: sector.id } });
      await prisma.period.delete({ where: { id: period.id } });
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/periods/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
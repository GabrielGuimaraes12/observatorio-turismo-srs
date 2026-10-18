import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Indicators (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  let adminToken: string;
  let userToken: string;
  let sectorId: string;
  let periodId: string;

  const createdIndicatorIds: string[] = [];
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

    // usuário comum
    const user = await register('Regular User', uniqueEmail('user'));
    userToken = user.token;

    // admin (registra + promove)
    const admin = await register('Admin User', uniqueEmail('admin'));
    await request(app.getHttpServer())
      .patch(`/api/auth/promote/${admin.user.id}`)
      .expect(200);

    const adminRow = await prisma.user.findUnique({ where: { id: admin.user.id } });
    expect(adminRow?.role).toBe('ADMIN');

    adminToken = admin.token;

    // dependências do Indicator: sector + period
    const sector = await prisma.sector.create({
      data: { name: `e2e-sector-${Date.now()}` },
    });
    sectorId = sector.id;

    const period = await prisma.period.create({
      data: {
        name: `e2e-period-${Date.now()}`,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      },
    });
    periodId = period.id;
  });

  afterAll(async () => {
    if (createdIndicatorIds.length) {
      await prisma.indicator.deleteMany({
        where: { id: { in: createdIndicatorIds } },
      });
    }
    // limpa qualquer indicator residual criado no sector/period de teste
    if (sectorId) {
      await prisma.indicator.deleteMany({ where: { sectorId } });
    }
    if (periodId) {
      await prisma.indicator.deleteMany({ where: { periodId } });
      await prisma.period.delete({ where: { id: periodId } }).catch(() => {});
    }
    if (sectorId) {
      await prisma.sector.delete({ where: { id: sectorId } }).catch(() => {});
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /api/indicators
  // -------------------------------------------------------------------------
  describe('GET /api/indicators', () => {
    it('returns 200 with an array (public, no auth)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/indicators')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/indicators/:id
  // -------------------------------------------------------------------------
  describe('GET /api/indicators/:id', () => {
    it('returns 200 and the indicator when it exists', async () => {
      const created = await prisma.indicator.create({
        data: {
          name: 'PIB',
          description: 'Produto Interno Bruto',
          value: 1000,
          unit: 'BRL',
          published: true,
          sectorId,
          periodId,
        },
      });
      createdIndicatorIds.push(created.id);

      const res = await request(app.getHttpServer())
        .get(`/api/indicators/${created.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.name).toBe('PIB');
      expect(res.body.sector).toMatchObject({ id: sectorId });
      expect(res.body.period).toMatchObject({ id: periodId });
    });

    it('returns 404 when the indicator does not exist', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/indicators/${missing}`)
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/indicators/not-a-uuid')
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/indicators
  // -------------------------------------------------------------------------
  describe('POST /api/indicators', () => {
    const validPayload = () => ({
      name: 'Inflação',
      description: 'IPCA',
      value: 4.5,
      unit: '%',
      published: true,
      sectorId,
      periodId,
    });

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/api/indicators')
        .send(validPayload())
        .expect(401);
    });

    it('returns 403 when the caller is not ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/indicators')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload())
        .expect(403);
    });

    it('creates an indicator as ADMIN and returns 201 with the row', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/indicators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload())
        .expect(201);

      createdIndicatorIds.push(res.body.id);

      expect(res.body).toMatchObject({
        name: 'Inflação',
        description: 'IPCA',
        value: 4.5,
        unit: '%',
        published: true,
        sectorId,
        periodId,
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.sector).toMatchObject({ id: sectorId });
      expect(res.body.period).toMatchObject({ id: periodId });
    });

    it('returns 400 when the body is invalid (missing name)', async () => {
      const { name, ...invalid } = validPayload();
      await request(app.getHttpServer())
        .post('/api/indicators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalid)
        .expect(400);
    });

    it('returns 400 when value is negative', async () => {
      await request(app.getHttpServer())
        .post('/api/indicators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload(), value: -1 })
        .expect(400);
    });

    it('returns 400 when sectorId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/api/indicators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload(), sectorId: 'invalid' })
        .expect(400);
    });

    it('returns 400 when the body has an unknown property (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/indicators')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload(), malicious: 'nope' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/indicators/:id
  // -------------------------------------------------------------------------
  describe('PATCH /api/indicators/:id', () => {
    let indicatorId: string;

    beforeEach(async () => {
      const created = await prisma.indicator.create({
        data: {
          name: 'To update',
          value: 1,
          sectorId,
          periodId,
        },
      });
      createdIndicatorIds.push(created.id);
      indicatorId = created.id;
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/indicators/${indicatorId}`)
        .send({ name: 'Renamed' })
        .expect(401);
    });

    it('returns 403 as a non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/indicators/${indicatorId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Renamed' })
        .expect(403);
    });

    it('updates as ADMIN and returns the changed row', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/indicators/${indicatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed', published: true })
        .expect(200);

      expect(res.body).toMatchObject({
        id: indicatorId,
        name: 'Renamed',
        published: true,
      });
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/indicators/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' })
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/indicators/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/indicators/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/indicators/:id', () => {
    it('returns 401 without a token', async () => {
      const r = await prisma.indicator.create({
        data: { name: 'Del', value: 0, sectorId, periodId },
      });
      createdIndicatorIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/indicators/${r.id}`)
        .expect(401);

      const stillThere = await prisma.indicator.findUnique({ where: { id: r.id } });
      expect(stillThere).not.toBeNull();
    });

    it('returns 403 as a non-admin', async () => {
      const r = await prisma.indicator.create({
        data: { name: 'Del', value: 0, sectorId, periodId },
      });
      createdIndicatorIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/indicators/${r.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('deletes as ADMIN and returns { success, id }', async () => {
      const r = await prisma.indicator.create({
        data: { name: 'Del', value: 0, sectorId, periodId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/indicators/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, id: r.id });

      const gone = await prisma.indicator.findUnique({ where: { id: r.id } });
      expect(gone).toBeNull();
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/indicators/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
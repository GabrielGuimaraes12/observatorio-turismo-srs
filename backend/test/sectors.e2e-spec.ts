import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Sectors (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  let adminToken: string;
  let userToken: string;

  const createdSectorIds: string[] = [];
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

    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'ADMIN' },
    });

    const adminRow = await prisma.user.findUnique({ where: { id: admin.user.id } });
    expect(adminRow?.role).toBe('ADMIN');

    adminToken = admin.token;
  });

  afterAll(async () => {
    if (createdSectorIds.length) {
      await prisma.sector.deleteMany({
        where: { id: { in: createdSectorIds } },
      });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /api/sectors
  // -------------------------------------------------------------------------
  describe('GET /api/sectors', () => {
    it('returns 200 with an array (public, no auth)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sectors')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/sectors/:id
  // -------------------------------------------------------------------------
  describe('GET /api/sectors/:id', () => {
    it('returns 200 and the sector (with indicators array)', async () => {
      const created = await prisma.sector.create({
        data: { name: `Hotelaria ${Date.now()}`, description: 'Setor hoteleiro' },
      });
      createdSectorIds.push(created.id);

      const res = await request(app.getHttpServer())
        .get(`/api/sectors/${created.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.name).toMatch(/^Hotelaria/);
      expect(Array.isArray(res.body.indicators)).toBe(true);
    });

    it('returns 404 when the sector does not exist', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/sectors/${missing}`)
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/sectors/not-a-uuid')
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/sectors
  // -------------------------------------------------------------------------
  describe('POST /api/sectors', () => {
    const validPayload = () => ({
      name: `Turismo ${Date.now()}`,
      description: 'Setor de turismo',
    });

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/api/sectors')
        .send(validPayload())
        .expect(401);
    });

    it('returns 403 when the caller is not ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/sectors')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validPayload())
        .expect(403);
    });

    it('creates a sector as ADMIN and returns 201', async () => {
      const payload = validPayload();

      const res = await request(app.getHttpServer())
        .post('/api/sectors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      createdSectorIds.push(res.body.id);

      expect(res.body).toMatchObject({
        name: payload.name,
        description: payload.description,
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(Array.isArray(res.body.indicators)).toBe(true);
    });

    it('returns 409 when the name already exists (P2002)', async () => {
      const name = `Duplicado ${Date.now()}`;
      const created = await prisma.sector.create({ data: { name } });
      createdSectorIds.push(created.id);

      await request(app.getHttpServer())
        .post('/api/sectors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(409);
    });

    it('returns 400 when the body is invalid (missing name)', async () => {
      await request(app.getHttpServer())
        .post('/api/sectors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'sem nome' })
        .expect(400);
    });

    it('returns 400 when the body has an unknown property (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/sectors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload(), malicious: 'nope' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/sectors/:id
  // -------------------------------------------------------------------------
  describe('PATCH /api/sectors/:id', () => {
    let sectorId: string;

    beforeEach(async () => {
      const created = await prisma.sector.create({
        data: { name: `ToUpdate ${Date.now()}`, description: 'old' },
      });
      createdSectorIds.push(created.id);
      sectorId = created.id;
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sectors/${sectorId}`)
        .send({ name: 'Renamed' })
        .expect(401);
    });

    it('returns 403 as a non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sectors/${sectorId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Renamed' })
        .expect(403);
    });

    it('updates as ADMIN and returns the changed row', async () => {
      const newName = `Renamed ${Date.now()}`;

      const res = await request(app.getHttpServer())
        .patch(`/api/sectors/${sectorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: newName, description: 'new' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: sectorId,
        name: newName,
        description: 'new',
      });
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/sectors/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' })
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/sectors/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/sectors/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/sectors/:id', () => {
    it('returns 401 without a token', async () => {
      const r = await prisma.sector.create({
        data: { name: `Del ${Date.now()}` },
      });
      createdSectorIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/sectors/${r.id}`)
        .expect(401);

      const stillThere = await prisma.sector.findUnique({ where: { id: r.id } });
      expect(stillThere).not.toBeNull();
    });

    it('returns 403 as a non-admin', async () => {
      const r = await prisma.sector.create({
        data: { name: `Del ${Date.now()}` },
      });
      createdSectorIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/sectors/${r.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('deletes as ADMIN and returns { success, id }', async () => {
      const r = await prisma.sector.create({
        data: { name: `Del ${Date.now()}` },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/sectors/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, id: r.id });

      const gone = await prisma.sector.findUnique({ where: { id: r.id } });
      expect(gone).toBeNull();
    });

    it('returns 409 when sector has related indicators (P2003)', async () => {
      // cria sector + period + indicator vinculado
      const sector = await prisma.sector.create({
        data: { name: `ComIndicador ${Date.now()}` },
      });
      const period = await prisma.period.create({
        data: {
          name: `p-${Date.now()}`,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });
      const indicator = await prisma.indicator.create({
        data: { name: 'Ind', value: 1, sectorId: sector.id, periodId: period.id },
      });

      await request(app.getHttpServer())
        .delete(`/api/sectors/${sector.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      // cleanup
      await prisma.indicator.delete({ where: { id: indicator.id } });
      await prisma.period.delete({ where: { id: period.id } });
      await prisma.sector.delete({ where: { id: sector.id } });
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/sectors/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
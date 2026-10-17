import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Reports (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  let adminToken: string;
  let userToken: string;
  let periodId: string;

  const createdReportIds: string[] = [];
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
    adminToken = admin.token;

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
    if (createdReportIds.length) {
      await prisma.report.deleteMany({ where: { id: { in: createdReportIds } } });
    }
    if (periodId) {
      await prisma.report.deleteMany({ where: { periodId } });
      await prisma.period.delete({ where: { id: periodId } }).catch(() => {});
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  describe('GET /api/reports', () => {
    it('returns 200 with an array (public, no auth)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('returns 200 and the report when it exists', async () => {
      const created = await prisma.report.create({
        data: {
          title: 'Get me',
          fileUrl: 'https://cdn.example.com/get-me.pdf',
          published: true,
          periodId,
        },
      });
      createdReportIds.push(created.id);

      const res = await request(app.getHttpServer())
        .get(`/api/reports/${created.id}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Get me');
      expect(res.body.period).toMatchObject({ id: periodId });
    });

    it('returns 404 when the report does not exist', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/reports/${missing}`)
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/not-a-uuid')
        .expect(400);
    });
  });

  describe('POST /api/reports', () => {
    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .send({ title: 'X', fileUrl: 'https://x/y.pdf' })
        .expect(401);
    });

    it('returns 403 when the caller is not ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'X', fileUrl: 'https://x/y.pdf' })
        .expect(403);
    });

    it('creates a report as ADMIN and returns 201 with the row', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Created by admin',
          description: 'desc',
          fileUrl: 'https://cdn.example.com/admin.pdf',
          periodId,
        })
        .expect(201);

      createdReportIds.push(res.body.id);

      expect(res.body).toMatchObject({
        title: 'Created by admin',
        description: 'desc',
        fileUrl: 'https://cdn.example.com/admin.pdf',
        published: false,
        periodId,
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.period).toMatchObject({ id: periodId });
    });

    it('returns 400 when the body is invalid (missing title)', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fileUrl: 'https://x/y.pdf' })
        .expect(400);
    });

    it('returns 400 when the body has an unknown property (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'X',
          fileUrl: 'https://x/y.pdf',
          malicious: 'nope',
        })
        .expect(400);
    });
  });

  describe('PATCH /api/reports/:id', () => {
    let reportId: string;

    beforeEach(async () => {
      const created = await prisma.report.create({
        data: {
          title: 'To update',
          fileUrl: 'https://cdn.example.com/upd.pdf',
          periodId,
        },
      });
      createdReportIds.push(created.id);
      reportId = created.id;
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .send({ title: 'Renamed' })
        .expect(401);
    });

    it('returns 403 as a non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Renamed' })
        .expect(403);
    });

    it('updates as ADMIN and returns the changed row', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Renamed', published: true })
        .expect(200);

      expect(res.body).toMatchObject({
        id: reportId,
        title: 'Renamed',
        published: true,
      });
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/reports/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Renamed' })
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/reports/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Renamed' })
        .expect(400);
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('returns 401 without a token', async () => {
      const r = await prisma.report.create({
        data: { title: 'Del', fileUrl: 'https://x/del.pdf', periodId },
      });
      createdReportIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .expect(401);

      const stillThere = await prisma.report.findUnique({ where: { id: r.id } });
      expect(stillThere).not.toBeNull();
    });

    it('returns 403 as a non-admin', async () => {
      const r = await prisma.report.create({
        data: { title: 'Del', fileUrl: 'https://x/del.pdf', periodId },
      });
      createdReportIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('deletes as ADMIN and returns { success, id }', async () => {
      const r = await prisma.report.create({
        data: { title: 'Del', fileUrl: 'https://x/del.pdf', periodId },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, id: r.id });

      const gone = await prisma.report.findUnique({ where: { id: r.id } });
      expect(gone).toBeNull();
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api/reports/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
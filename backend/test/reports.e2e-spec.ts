import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Reports (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let businessToken: string;
  let businessId: string;
  let otherBusinessToken: string;
  let otherBusinessId: string;
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

  const promote = async (userId: string, role: string) => {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    const row = await prisma.user.findUnique({ where: { id: userId } });
    expect(row?.role).toBe(role);
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

    // Fixtures — all created as USER then promoted, since the register
    // endpoint only creates USERs without an invitation token.
    const user = await register('Regular User', uniqueEmail('user'));
    userToken = user.token;

    const admin = await register('Admin User', uniqueEmail('admin'));
    await promote(admin.user.id, 'ADMIN');
    adminToken = admin.token;
    adminId = admin.user.id;

    const business = await register('Business One', uniqueEmail('biz'));
    await promote(business.user.id, 'BUSINESS');
    businessToken = business.token;
    businessId = business.user.id;

    const otherBiz = await register('Business Two', uniqueEmail('biz'));
    await promote(otherBiz.user.id, 'BUSINESS');
    otherBusinessToken = otherBiz.token;
    otherBusinessId = otherBiz.user.id;

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

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /reports — role-based visibility
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/reports', () => {
    let publishedId: string;
    let bizDraftId: string;
    let otherBizDraftId: string;
    let adminDraftId: string;

    beforeAll(async () => {
      const published = await prisma.report.create({
        data: {
          title: 'Published report',
          fileUrl: 'https://x/pub.pdf',
          published: true,
          periodId,
          authorId: adminId,
        },
      });
      publishedId = published.id;
      createdReportIds.push(published.id);

      const bizDraft = await prisma.report.create({
        data: {
          title: 'Biz draft',
          fileUrl: 'https://x/biz.pdf',
          published: false,
          periodId,
          authorId: businessId,
        },
      });
      bizDraftId = bizDraft.id;
      createdReportIds.push(bizDraft.id);

      const otherDraft = await prisma.report.create({
        data: {
          title: 'Other biz draft',
          fileUrl: 'https://x/other.pdf',
          published: false,
          periodId,
          authorId: otherBusinessId,
        },
      });
      otherBizDraftId = otherDraft.id;
      createdReportIds.push(otherDraft.id);

      const adminDraft = await prisma.report.create({
        data: {
          title: 'Admin draft',
          fileUrl: 'https://x/adm.pdf',
          published: false,
          periodId,
          authorId: adminId,
        },
      });
      adminDraftId = adminDraft.id;
      createdReportIds.push(adminDraft.id);
    });

    it('anonymous sees only published reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(bizDraftId);
      expect(ids).not.toContain(otherBizDraftId);
      expect(ids).not.toContain(adminDraftId);
    });

    it('USER sees only published reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(bizDraftId);
    });

    it('ADMIN sees only published reports (drafts are business-owned)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(adminDraftId); // admin's own draft NOT visible
      expect(ids).not.toContain(bizDraftId);
    });

    it('BUSINESS sees published reports plus their own drafts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).toContain(bizDraftId);
      expect(ids).not.toContain(otherBizDraftId); // other business's draft hidden
      expect(ids).not.toContain(adminDraftId);
    });

    it('returns sorted by createdAt descending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .expect(200);

      const timestamps = res.body.map((r: { createdAt: string }) =>
        new Date(r.createdAt).getTime(),
      );
      const sorted = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sorted);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /reports/:id — draft visibility
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/reports/:id', () => {
    let publishedReportId: string;
    let bizDraftId: string;

    beforeAll(async () => {
      const published = await prisma.report.create({
        data: {
          title: 'Get me',
          fileUrl: 'https://cdn.example.com/get-me.pdf',
          published: true,
          periodId,
          authorId: adminId,
        },
      });
      publishedReportId = published.id;
      createdReportIds.push(published.id);

      const draft = await prisma.report.create({
        data: {
          title: 'Draft',
          fileUrl: 'https://x/draft.pdf',
          published: false,
          periodId,
          authorId: businessId,
        },
      });
      bizDraftId = draft.id;
      createdReportIds.push(draft.id);
    });

    it('returns 200 and the published report anonymously', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${publishedReportId}`)
        .expect(200);

      expect(res.body.id).toBe(publishedReportId);
      expect(res.body.title).toBe('Get me');
      expect(res.body.period).toMatchObject({ id: periodId });
    });

    it('returns 200 to any authenticated role on a published report', async () => {
      for (const token of [userToken, businessToken, otherBusinessToken, adminToken]) {
        await request(app.getHttpServer())
          .get(`/api/reports/${publishedReportId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      }
    });

    it('returns 404 for a draft when anonymous', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .expect(404);
    });

    it('returns 404 for a draft when called by a different BUSINESS', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${otherBusinessToken}`)
        .expect(404);
    });

    it('returns 404 for a draft when called by ADMIN (not the author)', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 200 for a draft when called by its BUSINESS author', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(res.body.id).toBe(bizDraftId);
      expect(res.body.published).toBe(false);
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

  // ══════════════════════════════════════════════════════════════════════════
  //  POST /reports
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/reports', () => {
    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .send({ title: 'X', fileUrl: 'https://x/y.pdf' })
        .expect(401);
    });

    it('returns 403 when the caller is USER', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'X', fileUrl: 'https://x/y.pdf' })
        .expect(403);
    });

    it('creates a report as ADMIN and sets authorId to the admin', async () => {
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
        authorId: adminId,
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.period).toMatchObject({ id: periodId });
    });

    it('creates a report as BUSINESS and sets authorId to the business', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          title: 'Created by business',
          fileUrl: 'https://x/biz-created.pdf',
          periodId,
        })
        .expect(201);

      createdReportIds.push(res.body.id);

      expect(res.body.authorId).toBe(businessId);
      expect(res.body.published).toBe(false);

      // The business can immediately see its own draft.
      const list = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);
      expect(list.body.some((r: { id: string }) => r.id === res.body.id)).toBe(true);
    });

    it('ignores a client-supplied authorId (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          title: 'X',
          fileUrl: 'https://x/y.pdf',
          authorId: otherBusinessId,
        })
        .expect(400);
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

  // ══════════════════════════════════════════════════════════════════════════
  //  PATCH /reports/:id
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /api/reports/:id', () => {
    let reportId: string;

    beforeEach(async () => {
      const created = await prisma.report.create({
        data: {
          title: 'To update',
          fileUrl: 'https://cdn.example.com/upd.pdf',
          periodId,
          authorId: businessId,
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

    it('returns 403 as a USER', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Renamed' })
        .expect(403);
    });

    it('returns 403 as a BUSINESS (only ADMIN can update)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ title: 'Renamed' })
        .expect(403);
    });

    it('returns 404 when ADMIN tries to edit a draft they do not own', async () => {
      // `reportId` (from beforeEach) is a draft authored by businessId.
      // Under Model 2, the admin cannot edit a draft they didn't author.
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Renamed' })
        .expect(404);
    });
    
    it('updates a published report as ADMIN', async () => {
      await prisma.report.update({
        where: { id: reportId },
        data: { published: true },
      });
    
      const res = await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Renamed' })
        .expect(200);
    
      expect(res.body).toMatchObject({
        id: reportId,
        title: 'Renamed',
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

  // ══════════════════════════════════════════════════════════════════════════
  //  DELETE /reports/:id
  // ══════════════════════════════════════════════════════════════════════════
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

    it('returns 403 as a USER', async () => {
      const r = await prisma.report.create({
        data: { title: 'Del', fileUrl: 'https://x/del.pdf', periodId },
      });
      createdReportIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns 403 as a BUSINESS', async () => {
      const r = await prisma.report.create({
        data: { title: 'Del', fileUrl: 'https://x/del.pdf', periodId },
      });
      createdReportIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(403);
    });

    it('deletes a published report as ADMIN', async () => {
      const r = await prisma.report.create({
        data: {
          title: 'Del',
          fileUrl: 'https://x/del.pdf',
          periodId,
          authorId: businessId,
          published: true,        // ← must be published
        },
      });
    
      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    
      expect(res.body).toEqual({ success: true, id: r.id });
    
      const gone = await prisma.report.findUnique({ where: { id: r.id } });
      expect(gone).toBeNull();
    });
    
    it('returns 404 when ADMIN tries to delete a draft they do not own', async () => {
      const r = await prisma.report.create({
        data: {
          title: 'Draft',
          fileUrl: 'https://x/d.pdf',
          periodId,
          authorId: businessId,
          published: false,       // ← draft
        },
      });
      createdReportIds.push(r.id);
    
      await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
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
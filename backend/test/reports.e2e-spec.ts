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
  let adminId: string;
  let userToken: string;
  let hrToken: string;
  let businessToken: string;
  let businessId: string;
  let otherBusinessToken: string;
  let otherBusinessId: string;
  let periodId: string;

  const createdReportIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdPeriodIds: string[] = [];

  // Minimal but structurally valid PDF bytes for the upload.
  const fakePdf = () => Buffer.from('%PDF-1.4\n%%EOF\n');

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
    await prisma.user.update({ where: { id: userId }, data: { role } });
    const row = await prisma.user.findUnique({ where: { id: userId } });
    expect(row?.role).toBe(role);
  };

  const validPeriod = () => ({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  });

  // Multipart POST helper — mirrors ReportsController.create's
  // FileInterceptor('file') + TransformReportFormInterceptor contract.
  const postReportMultipart = (token: string) => {
    const p = validPeriod();
    return request(app.getHttpServer())
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Admin draft via API')
      .field('fileUrl', 'placeholder') // ← remove; see note below
      .field('period[startDate]', p.startDate)
      .field('period[endDate]', p.endDate);
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

    const hr = await register('HR User', uniqueEmail('hr'));
    await promote(hr.user.id, 'HR');
    hrToken = hr.token;

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

    const year = 2100 + Math.floor(Math.random() * 100);
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31));

    const period = await prisma.period.create({
      data: { name: `e2e-period-${Date.now()}`, startDate, endDate },
    });
    periodId = period.id;
    createdPeriodIds.push(period.id);
  });

  afterAll(async () => {
    if (createdReportIds.length) {
      await prisma.report.deleteMany({ where: { id: { in: createdReportIds } } });
    }
    await prisma.report.deleteMany({ where: { periodId } });
    if (createdPeriodIds.length) {
      await prisma.period.deleteMany({ where: { id: { in: createdPeriodIds } } });
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
      expect(ids).not.toContain(otherBizDraftId);
      expect(ids).not.toContain(adminDraftId);
    });

    it('HR sees only published reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(bizDraftId);
      expect(ids).not.toContain(otherBizDraftId);
      expect(ids).not.toContain(adminDraftId);
    });

    it('ADMIN sees all reports, including every draft', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).toContain(adminDraftId);
      expect(ids).toContain(bizDraftId);
      expect(ids).toContain(otherBizDraftId);
    });

    it('BUSINESS sees published reports plus their own drafts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      const ids = res.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(publishedId);
      expect(ids).toContain(bizDraftId);
      expect(ids).not.toContain(otherBizDraftId);
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

    // Regression for the bug report: ADMIN creates a draft via the API
    // (multipart + PDF upload) and it MUST appear in the admin listing.
    it('ADMIN can create a draft and find it in its own listing', async () => {
      const p = validPeriod();
      const created = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Admin draft via API')
        .field('published', 'false')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'admin-api.pdf')
        .expect(201);

      createdReportIds.push(created.body.id);
      expect(created.body.published).toBe(false);

      const list = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(list.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: created.body.id, published: false }),
        ]),
      );
    });

    it('a different ADMIN sees every draft (global admin visibility)', async () => {
      const otherAdmin = await register('Other Admin', uniqueEmail('admin2'));
      await promote(otherAdmin.user.id, 'ADMIN');

      const list = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${otherAdmin.token}`)
        .expect(200);

      const ids = list.body.map((r: { id: string }) => r.id);
      expect(ids).toContain(adminDraftId);
      expect(ids).toContain(bizDraftId);
      expect(ids).toContain(otherBizDraftId);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /reports/:id — draft visibility
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/reports/:id', () => {
    let publishedReportId: string;
    let bizDraftId: string;
    let adminDraftId: string;

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

      const adminDraft = await prisma.report.create({
        data: {
          title: 'Admin draft',
          fileUrl: 'https://x/admin-draft.pdf',
          published: false,
          periodId,
          authorId: adminId,
        },
      });
      adminDraftId = adminDraft.id;
      createdReportIds.push(adminDraft.id);
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
      for (const token of [
        userToken,
        hrToken,
        businessToken,
        otherBusinessToken,
        adminToken,
      ]) {
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

    it('returns 404 for a draft when called by a USER', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('returns 404 for a draft when called by HR', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(404);
    });

    it('returns 404 for a draft when called by a different BUSINESS', async () => {
      await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${otherBusinessToken}`)
        .expect(404);
    });

    it('returns 200 for a BUSINESS draft when called by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${bizDraftId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(bizDraftId);
      expect(res.body.published).toBe(false);
    });

    it('returns 200 for its own draft when called by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/${adminDraftId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(adminDraftId);
      expect(res.body.published).toBe(false);
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
  //  POST /reports — multipart with a required PDF
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/reports', () => {
    it('returns 401 when no token is provided', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .field('title', 'X')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(401);
    });

    it('returns 403 when the caller is USER', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', 'X')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(403);
    });

    it('returns 403 when the caller is HR', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${hrToken}`)
        .field('title', 'X')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(403);
    });

    it('creates a report as ADMIN and sets authorId to the admin', async () => {
      const p = validPeriod();
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Created by admin')
        .field('description', 'desc')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'admin.pdf')
        .expect(201);

      createdReportIds.push(res.body.id);

      expect(res.body).toMatchObject({
        title: 'Created by admin',
        description: 'desc',
        published: false,
        authorId: adminId,
      });
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.fileUrl).toEqual(expect.any(String));
      expect(res.body.period).toMatchObject({
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
    });

    it('creates a report as BUSINESS and sets authorId to the business', async () => {
      const p = validPeriod();
      const res = await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .field('title', 'Created by business')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'biz.pdf')
        .expect(201);

      createdReportIds.push(res.body.id);

      expect(res.body.authorId).toBe(businessId);
      expect(res.body.published).toBe(false);

      const list = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);
      expect(list.body.some((r: { id: string }) => r.id === res.body.id)).toBe(true);
    });

    it('returns 403 when BUSINESS tries to publish on creation', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .field('title', 'X')
        .field('published', 'true')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(403);
    });

    it('rejects a client-supplied authorId (whitelist)', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${businessToken}`)
        .field('title', 'X')
        .field('authorId', otherBusinessId)
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(400);
    });

    it('returns 400 when the body is invalid (missing title)', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(400);
    });

    it('returns 400 when the body has an unknown property (whitelist)', async () => {
      const p = validPeriod();
      await request(app.getHttpServer())
        .post('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'X')
        .field('malicious', 'nope')
        .field('period[startDate]', p.startDate)
        .field('period[endDate]', p.endDate)
        .attach('file', fakePdf(), 'x.pdf')
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  PATCH /reports/:id — multipart optional PDF
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
        .field('title', 'Renamed')
        .expect(401);
    });

    it('returns 403 as a USER', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', 'Renamed')
        .expect(403);
    });

    it('returns 403 as HR', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .field('title', 'Renamed')
        .expect(403);
    });

    it('returns 403 as a BUSINESS (only ADMIN can update)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .field('title', 'Renamed')
        .expect(403);
    });

    it('allows ADMIN to publish a draft submitted by BUSINESS', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('published', 'true')
        .expect(200);

      expect(res.body.published).toBe(true);
    });

    it('updates a published report as ADMIN', async () => {
      await prisma.report.update({
        where: { id: reportId },
        data: { published: true },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Renamed')
        .expect(200);

      expect(res.body).toMatchObject({ id: reportId, title: 'Renamed' });
    });

    it('returns 404 for a non-existent id', async () => {
      const missing = '00000000-0000-4000-8000-000000000000';
      await request(app.getHttpServer())
        .patch(`/api/reports/${missing}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Renamed')
        .expect(404);
    });

    it('returns 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer())
        .patch('/api/reports/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Renamed')
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

    it('returns 403 as HR', async () => {
      const r = await prisma.report.create({
        data: { title: 'Del', fileUrl: 'https://x/del.pdf', periodId },
      });
      createdReportIds.push(r.id);

      await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
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
          published: true,
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

    it('allows ADMIN to delete a BUSINESS draft', async () => {
      const r = await prisma.report.create({
        data: {
          title: 'Draft',
          fileUrl: 'https://x/d.pdf',
          periodId,
          authorId: businessId,
          published: false,
        },
      });
      createdReportIds.push(r.id);

      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, id: r.id });
    });

    it('allows ADMIN to delete its own draft', async () => {
      const r = await prisma.report.create({
        data: {
          title: 'Admin draft',
          fileUrl: 'https://x/adm-d.pdf',
          periodId,
          authorId: adminId,
          published: false,
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/reports/${r.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true, id: r.id });
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
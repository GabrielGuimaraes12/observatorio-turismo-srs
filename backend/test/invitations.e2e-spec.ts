import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('Invitations & Users (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  const createdUserIds: string[] = [];
  const createdInvitationIds: string[] = [];

  let hrToken: string;
  let hrUserId: string;
  let adminToken: string;
  let adminUserId: string;
  let businessToken: string;
  let businessUserId: string;
  let userToken: string;
  let userUserId: string;

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const registerViaInvitation = async (
    invitationToken: string,
    email: string,
    name = 'Invitee',
  ) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'Passw0rd!',
        invitationToken,
      })
      .expect(201);
    createdUserIds.push(res.body.user.id);
    return res.body as { token: string; user: { id: string; role: string; email: string } };
  };

  const login = async (email: string, password = 'Passw0rd!') => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body.token as string;
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

    // ── Fixture: HR user seeded directly (bypasses HTTP, same as bootstrap) ──
    const hrEmail = uniqueEmail('hr');
    const hrPasswordHash = await bcrypt.hash('Passw0rd!', 4); // fast rounds for tests
    const hr = await prisma.user.create({
      data: { name: 'HR Fixture', email: hrEmail, passwordHash: hrPasswordHash, role: 'HR' },
    });
    createdUserIds.push(hr.id);
    hrUserId = hr.id;
    hrToken = await login(hrEmail);

    // ── Fixture: ADMIN user promoted via an invitation ──
    const adminInviteRes = await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ email: uniqueEmail('admin'), role: 'ADMIN' })
      .expect(201);
    createdInvitationIds.push(adminInviteRes.body.id);

    const adminEmail = adminInviteRes.body.email as string;
    const admin = await registerViaInvitation(adminInviteRes.body.token, adminEmail, 'Admin Fixture');
    adminUserId = admin.user.id;
    adminToken = admin.token;

    // ── Fixture: BUSINESS user invited by the ADMIN ──
    const bizInviteRes = await request(app.getHttpServer())
      .post('/api/invitations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: uniqueEmail('biz'), role: 'BUSINESS' })
      .expect(201);
    createdInvitationIds.push(bizInviteRes.body.id);

    const bizEmail = bizInviteRes.body.email as string;
    const biz = await registerViaInvitation(bizInviteRes.body.token, bizEmail, 'Biz Fixture');
    businessUserId = biz.user.id;
    businessToken = biz.token;

    // ── Fixture: USER self-registered ──
    const userEmail = uniqueEmail('user');
    const userRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'User Fixture',
        email: userEmail,
        password: 'Passw0rd!',
      })
      .expect(201);
    createdUserIds.push(userRes.body.user.id);
    userUserId = userRes.body.user.id;
    userToken = userRes.body.token;
  });

  afterAll(async () => {
    // Cleanup in FK-safe order. Invitations first (no FK but convenient),
    // then ChangeLog (references users), then users.
    if (createdInvitationIds.length) {
      await prisma.invitation.deleteMany({ where: { id: { in: createdInvitationIds } } });
    }
    // Also delete any invitation created during the tests whose id we didn't track.
    await prisma.invitation.deleteMany({ where: { createdById: { in: createdUserIds } } });
    await prisma.changeLog.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.changeLog.deleteMany({ where: { entityId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Registration — self vs invited
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/auth/register', () => {
    it('self-registers a USER when no invitation token is sent', async () => {
      const email = uniqueEmail('self');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Self',
          email,
          password: 'Passw0rd!',
        })
        .expect(201);

      createdUserIds.push(res.body.user.id);

      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email, role: 'USER' });
      expect(res.body.user).not.toHaveProperty('passwordHash');

      const row = await prisma.user.findUnique({ where: { id: res.body.user.id } });
      expect(row).not.toBeNull();
      expect(row?.role).toBe('USER');
      expect(row?.isActive).toBe(true);
      expect(row?.passwordHash).not.toBe('Passw0rd!'); // must be hashed
    });

    it('treats an empty invitationToken string as absent', async () => {
      const email = uniqueEmail('empty');
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Empty Token',
          email,
          password: 'Passw0rd!',
          invitationToken: '',
        })
        .expect(201);

      createdUserIds.push(res.body.user.id);
      expect(res.body.user.role).toBe('USER');

      const row = await prisma.user.findUnique({ where: { id: res.body.user.id } });
      expect(row?.role).toBe('USER');
    });

    it('rejects a client-supplied role field (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Cheat',
          email: uniqueEmail('cheat'),
          password: 'Passw0rd!',
          role: 'HR',
        })
        .expect(400);
    });

    it('rejects duplicate email (self-register path)', async () => {
      const email = uniqueEmail('dup');
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'A Valid Name', email, password: 'Passw0rd!' })
        .expect(201)
        .then((r) => createdUserIds.push(r.body.user.id));

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'B Valid Name', email, password: 'Passw0rd!' })
        .expect(409);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Invitations — creation and permissions
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/invitations', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/invitations')
        .send({ email: uniqueEmail('x'), role: 'ADMIN' })
        .expect(401);
    });

    it('returns 403 for BUSINESS and USER callers', async () => {
      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ email: uniqueEmail('x'), role: 'ADMIN' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: uniqueEmail('x'), role: 'ADMIN' })
        .expect(403);
    });

    it('HR can invite HR', async () => {
      const email = uniqueEmail('hr2');
      const res = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'HR' })
        .expect(201);

      createdInvitationIds.push(res.body.id);
      expect(res.body.role).toBe('HR');
      expect(res.body.email).toBe(email);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.expiresAt).toEqual(expect.any(String));

      const row = await prisma.invitation.findUnique({ where: { id: res.body.id } });
      expect(row).not.toBeNull();
      expect(row?.role).toBe('HR');
      expect(row?.email).toBe(email);
      expect(row?.usedAt).toBeNull();
      expect(row?.createdById).toBe(hrUserId);
      // Token must be hashed, not stored in plaintext
      expect(row?.tokenHash).not.toBe(res.body.token);
      expect(row?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('HR can invite ADMIN', async () => {
      const email = uniqueEmail('admin2');
      const res = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);

      createdInvitationIds.push(res.body.id);
      expect(res.body.role).toBe('ADMIN');
    });

    it('HR cannot invite BUSINESS', async () => {
      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email: uniqueEmail('nope'), role: 'BUSINESS' })
        .expect(403);
    });

    it('ADMIN can invite BUSINESS', async () => {
      const email = uniqueEmail('biz2');
      const res = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);

      createdInvitationIds.push(res.body.id);
      expect(res.body.role).toBe('BUSINESS');
      expect(res.body.email).toBe(email);
    });

    it('ADMIN cannot invite HR or ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: uniqueEmail('nope'), role: 'HR' })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: uniqueEmail('nope'), role: 'ADMIN' })
        .expect(403);
    });

    it('rejects a duplicate pending invitation for the same email', async () => {
      const email = uniqueEmail('dup-invite');
      const first = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(first.body.id);

      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(409);
    });

    it('rejects an invitation for an email that is already registered', async () => {
      const email = uniqueEmail('taken');
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Taken', email, password: 'Passw0rd!' })
        .expect(201);
      createdUserIds.push(reg.body.user.id);

      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(409);
    });

    it('rejects an invalid role value', async () => {
      await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email: uniqueEmail('bad'), role: 'SUPER_ADMIN' })
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Register with invitation — happy path and all failure modes
  // ══════════════════════════════════════════════════════════════════════════
  describe('POST /api/auth/register with invitationToken', () => {
    it('creates a user with the invitation role and marks it used', async () => {
      const email = uniqueEmail('invited');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Invited',
          email,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(201);
      createdUserIds.push(res.body.user.id);

      expect(res.body.user).toMatchObject({ email, role: 'ADMIN' });
      expect(res.body.token).toEqual(expect.any(String));

      const userRow = await prisma.user.findUnique({ where: { id: res.body.user.id } });
      expect(userRow?.role).toBe('ADMIN');

      const invRow = await prisma.invitation.findUnique({ where: { id: inv.body.id } });
      expect(invRow?.usedAt).not.toBeNull();

      const log = await prisma.changeLog.findFirst({
        where: { action: 'register-admin', entityId: res.body.user.id },
      });
      expect(log).not.toBeNull();
    });

    it('rejects an invalid invitation token (403)', async () => {
      const email = uniqueEmail('bad-token');
      const before = await prisma.user.count({ where: { email } });

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'XYZ',
          email,
          password: 'Passw0rd!',
          invitationToken: 'not-a-real-token',
        })
        .expect(403);

      const after = await prisma.user.count({ where: { email } });
      expect(after).toBe(before); // no user created
    });

    it('rejects a reused invitation (403)', async () => {
      const email1 = uniqueEmail('reuse1');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email: email1, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'ABC',
          email: email1,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(201)
        .then((r) => createdUserIds.push(r.body.user.id));

      const email2 = uniqueEmail('reuse2');
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'BCD',
          email: email2,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(403);

      const count = await prisma.user.count({ where: { email: email2 } });
      expect(count).toBe(0);
    });

    it('rejects registration when the email does not match the invitation (403)', async () => {
      const invEmail = uniqueEmail('for');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email: invEmail, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);

      const otherEmail = uniqueEmail('other');
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'XYZ',
          email: otherEmail,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(403);

      const count = await prisma.user.count({ where: { email: otherEmail } });
      expect(count).toBe(0);
    });

    it('rejects an expired invitation (403) and does not consume it', async () => {
      const email = uniqueEmail('exp');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);

      await prisma.invitation.update({
        where: { id: inv.body.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'XYZ',
          email,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(403);

      const invRow = await prisma.invitation.findUnique({ where: { id: inv.body.id } });
      expect(invRow?.usedAt).toBeNull(); // not consumed by an expired attempt
    });

    it('rejects a valid invitation if the email is already registered, without consuming it', async () => {
      const email = uniqueEmail('taken-inv');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);

      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'First', email, password: 'Passw0rd!' })
        .expect(201);
      createdUserIds.push(reg.body.user.id);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Second',
          email,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(409);

      const invRow = await prisma.invitation.findUnique({ where: { id: inv.body.id } });
      expect(invRow?.usedAt).toBeNull(); // transaction rolled back — invitation untouched
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  GET /api/invitations — listing
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/invitations', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/invitations').expect(401);
    });

    it('returns 403 for BUSINESS and USER', async () => {
      await request(app.getHttpServer())
        .get('/api/invitations')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/invitations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('HR sees their own pending invitations', async () => {
      const email = uniqueEmail('list');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);

      const res = await request(app.getHttpServer())
        .get('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const listed = res.body.find((i: { id: string }) => i.id === inv.body.id);
      expect(listed).toMatchObject({ email, role: 'ADMIN' });
      // The plaintext token must NOT be returned here
      expect(listed).not.toHaveProperty('token');
    });

    it('ADMIN sees only their own pending invitations', async () => {
      const hrEmail = uniqueEmail('hr-only');
      const hrInv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email: hrEmail, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(hrInv.body.id);

      const res = await request(app.getHttpServer())
        .get('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(hrInv.body.id);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  DELETE /api/invitations/:id — revoke
  // ══════════════════════════════════════════════════════════════════════════
  describe('DELETE /api/invitations/:id', () => {
    it('revokes a pending invitation and removes the row', async () => {
      const email = uniqueEmail('revoke');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/invitations/${inv.body.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      const row = await prisma.invitation.findUnique({ where: { id: inv.body.id } });
      expect(row).toBeNull();

      // The token, though revoked, should not work anymore
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'XYW',
          email,
          password: 'Passw0rd!',
          invitationToken: inv.body.token,
        })
        .expect(403);
    });

    it('returns 404 for a non-existent invitation', async () => {
      await request(app.getHttpServer())
        .delete('/api/invitations/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(404);
    });

    it('returns 400 for a non-UUID id', async () => {
      await request(app.getHttpServer())
        .delete('/api/invitations/not-a-uuid')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Users — listing with role filter
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /api/users?role=', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/users?role=ADMIN').expect(401);
    });

    it('returns 400 when role query param is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(400);
    });

    it('returns 400 for an invalid role value', async () => {
      await request(app.getHttpServer())
        .get('/api/users?role=SUPER_ADMIN')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(400);
    });

    it('returns 403 for BUSINESS and USER callers', async () => {
      await request(app.getHttpServer())
        .get('/api/users?role=USER')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/users?role=USER')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('HR can list every role', async () => {
			for (const role of ['HR', 'ADMIN', 'BUSINESS', 'USER']) {
				const res = await request(app.getHttpServer())
					.get(`/api/users?role=${role}`)
					.set('Authorization', `Bearer ${hrToken}`)
					.expect(200);
		
				expect(Array.isArray(res.body)).toBe(true);
				for (const u of res.body) {
					expect(u.role).toBe(role);
					expect(u).not.toHaveProperty('passwordHash');
				}
		
				if (role === 'HR') {
					expect(res.body.some((u: { id: string }) => u.id === hrUserId)).toBe(true);
				}
			}
		});

    it('ADMIN can list BUSINESS and USER', async () => {
      const bizRes = await request(app.getHttpServer())
        .get('/api/users?role=BUSINESS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(bizRes.body.some((u: { id: string }) => u.id === businessUserId)).toBe(true);

      const userRes = await request(app.getHttpServer())
        .get('/api/users?role=USER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(userRes.body.some((u: { id: string }) => u.id === userUserId)).toBe(true);
    });

    it('ADMIN cannot list HR or ADMIN', async () => {
      await request(app.getHttpServer())
        .get('/api/users?role=HR')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Deactivate / reactivate
  // ══════════════════════════════════════════════════════════════════════════
  describe('DELETE /api/users/:id (deactivate)', () => {
    it('HR can deactivate a BUSINESS user, and their login stops working', async () => {
      // Create a disposable business to avoid touching the shared fixture
      const email = uniqueEmail('delbiz');
      const bizInv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(bizInv.body.id);

      const biz = await registerViaInvitation(bizInv.body.token, email, 'Disposable');

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      const row = await prisma.user.findUnique({ where: { id: biz.user.id } });
      expect(row?.isActive).toBe(false);

      // Login now fails — deactivated
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Passw0rd!' })
        .expect(401);

      // Existing token also stops working on guarded endpoints
      await request(app.getHttpServer())
        .get('/api/users?role=BUSINESS')
        .set('Authorization', `Bearer ${biz.token}`)
        .expect(401);
    });

    it('ADMIN can deactivate a BUSINESS user', async () => {
      const email = uniqueEmail('adbiz');
      const bizInv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(bizInv.body.id);
      const biz = await registerViaInvitation(bizInv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const row = await prisma.user.findUnique({ where: { id: biz.user.id } });
      expect(row?.isActive).toBe(false);
    });

    it('ADMIN cannot deactivate an HR or another ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${hrUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      // Create a spare admin to test admin-on-admin
      const email = uniqueEmail('spare-admin');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const spare = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${spare.user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('nobody can deactivate themselves', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${hrUserId}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('returns 409 when the user is already deactivated', async () => {
      const email = uniqueEmail('twice');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const biz = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(409);
    });

    it('returns 404 for a non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(404);
    });

    it('writes a ChangeLog entry for the deactivation', async () => {
      const email = uniqueEmail('log');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const biz = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      const log = await prisma.changeLog.findFirst({
        where: { action: 'deactivate-user', entityId: biz.user.id },
      });
			expect(log).not.toBeNull();
      expect(log?.userId).toBe(hrUserId);
    });
  });

  describe('PATCH /api/users/:id/activate (reactivate)', () => {
    it('HR reactivates a deactivated user and login works again', async () => {
      const email = uniqueEmail('react');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const biz = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Passw0rd!' })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`/api/users/${biz.user.id}/activate`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      const row = await prisma.user.findUnique({ where: { id: biz.user.id } });
      expect(row?.isActive).toBe(true);

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Passw0rd!' })
        .expect(200);
      expect(login.body.token).toEqual(expect.any(String));
    });

    it('ADMIN cannot reactivate an HR', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${hrUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('ADMIN cannot reactivate another ADMIN', async () => {
      const email = uniqueEmail('spare-reactivate');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ email, role: 'ADMIN' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const spare = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .patch(`/api/users/${spare.user.id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('returns 409 when the user is already active', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${businessUserId}/activate`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(409);
    });

    it('returns 404 for a non-existent user', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/00000000-0000-4000-8000-000000000000/activate')
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(404);
    });

    it('writes a ChangeLog entry for the reactivation', async () => {
      const email = uniqueEmail('react-log');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const biz = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/users/${biz.user.id}/activate`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      const log = await prisma.changeLog.findFirst({
        where: { action: 'reactivate-user', entityId: biz.user.id },
      });
      expect(log).not.toBeNull();
      expect(log?.userId).toBe(hrUserId);
    });
  });

  describe('POST /api/auth/login with a deactivated user', () => {
    it('rejects login with 401 when the account is deactivated', async () => {
      const email = uniqueEmail('deact-login');
      const inv = await request(app.getHttpServer())
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'BUSINESS' })
        .expect(201);
      createdInvitationIds.push(inv.body.id);
      const biz = await registerViaInvitation(inv.body.token, email);

      await request(app.getHttpServer())
        .delete(`/api/users/${biz.user.id}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Passw0rd!' })
        .expect(401);
    });

    it('rejects login with 401 for a nonexistent email (same shape as deactivated)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: uniqueEmail('nobody'), password: 'Passw0rd!' })
        .expect(401);
    });
  });
});
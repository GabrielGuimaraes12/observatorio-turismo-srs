
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
  let publishedIndicatorId: string;
  let privateIndicatorId: string;

  const createdUserIds: string[] = [];

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const register = async (name: string, email: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name,
        email,
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
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
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

    // Criar usuário comum
    const user = await register(
      'Regular User',
      uniqueEmail('indicator-user'),
    );

    userToken = user.token;

    // Criar administrador
    const admin = await register(
      'Admin User',
      uniqueEmail('indicator-admin'),
    );

    await prisma.user.update({
      where: { id: admin.user.id },
      data: { role: 'ADMIN' },
    });

    adminToken = admin.token;

    // Criar setor de teste
    const sector = await prisma.sector.create({
      data: {
        name: `e2e-sector-${Date.now()}-${Math.random()}`,
      },
    });

    sectorId = sector.id;

    // Criar período de teste
    const period = await prisma.period.create({
      data: {
        name: `e2e-period-${Date.now()}`,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });

    periodId = period.id;

    // Indicador publicado
    const published = await prisma.indicator.create({
      data: {
        name: 'Indicador E2E Publicado',
        description: 'Teste de publicação',
        value: 120,
        unit: 'unidades',
        published: true,
        sectorId,
        periodId,
      },
    });

    publishedIndicatorId = published.id;

    // Indicador privado
    const privateIndicator = await prisma.indicator.create({
      data: {
        name: 'Indicador E2E Privado',
        description: 'Teste de privacidade',
        value: 999,
        unit: 'unidades',
        published: false,
        sectorId,
        periodId,
      },
    });

    privateIndicatorId = privateIndicator.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        // Remover somente os dados criados pelos testes
        const indicatorIds = [
          publishedIndicatorId,
          privateIndicatorId,
        ].filter((id): id is string => Boolean(id));

        if (indicatorIds.length) {
          await prisma.indicator.deleteMany({
            where: { id: { in: indicatorIds } },
          });
        }

        if (sectorId) {
          await prisma.sector.delete({
            where: { id: sectorId },
          });
        }

        if (periodId) {
          await prisma.period.delete({
            where: { id: periodId },
          });
        }

        if (createdUserIds.length) {
          await prisma.user.deleteMany({
            where: { id: { in: createdUserIds } },
          });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  describe('GET /api/indicators/public', () => {
    it('returns 200 without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/indicators/public')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns published indicators', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/indicators/public')
        .expect(200);

      const indicator = res.body.find(
        (item: { id: string }) =>
          item.id === publishedIndicatorId,
      );

      expect(indicator).toBeDefined();
      expect(indicator).toMatchObject({
        id: publishedIndicatorId,
        name: 'Indicador E2E Publicado',
        value: 120,
        published: true,
      });

      expect(indicator.sector.id).toBe(sectorId);
      expect(indicator.period.id).toBe(periodId);
    });

    it('does not expose unpublished indicators', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/indicators/public')
        .expect(200);

      const ids = res.body.map(
        (item: { id: string }) => item.id,
      );

      expect(ids).toContain(publishedIndicatorId);
      expect(ids).not.toContain(privateIndicatorId);

      expect(
        res.body.every(
          (item: { published: boolean }) =>
            item.published === true,
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/indicators', () => {
    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .get('/api/indicators')
        .expect(401);
    });

    it('returns 403 for a regular USER', async () => {
      await request(app.getHttpServer())
        .get('/api/indicators')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('allows ADMIN to view all indicators', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/indicators')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.map(
        (item: { id: string }) => item.id,
      );

      expect(ids).toContain(publishedIndicatorId);
      expect(ids).toContain(privateIndicatorId);
    });
  });

  describe('GET /api/indicators/:id', () => {
    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/indicators/${privateIndicatorId}`)
        .expect(401);
    });

    it('returns 403 for a regular USER', async () => {
      await request(app.getHttpServer())
        .get(`/api/indicators/${privateIndicatorId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('allows ADMIN to view an unpublished indicator', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/indicators/${privateIndicatorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: privateIndicatorId,
        published: false,
        value: 999,
      });
    });
  });
});

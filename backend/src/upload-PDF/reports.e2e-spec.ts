import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { join } from 'node:path';
import { AppModule } from '../app.module.js';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  const fixture = join(__dirname, '..', 'fixtures', 'relatorio-valido.pdf');
  const invalidFixture = join(__dirname, '..', 'fixtures', 'arquivo-invalido.txt');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => await app.close());

  it('cria relatório com PDF válido', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', 'Bearer token-admin')
      .field('title', 'Relatório Teste')
      .attach('pdf', fixture);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('pdfPath');
  });

  it('rejeita arquivo não-PDF', async () => {
    const res = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', 'Bearer token-admin')
      .field('title', 'Inválido')
      .attach('pdf', invalidFixture);
    expect(res.status).toBe(400);
  });

  it('rejeita arquivo acima do limite', async () => {
    // use um fixture > 10MB ou mock; verifica 400
  });

  it('preserva PDF ao editar sem novo arquivo', async () => {
    // 1) cria com PDF; 2) PATCH só com title; 3) GET relatório e compara pdfPath
  });

  it('bloqueia acesso a PDF não publicado para usuário comum', async () => {
    // cria com isPublished=false; GET /reports/:id/pdf com token user -> 403
  });
});
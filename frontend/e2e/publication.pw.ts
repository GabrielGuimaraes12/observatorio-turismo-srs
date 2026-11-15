import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const runId = randomUUID().slice(0, 8);
const email = `admin-${runId}@example.com`;
const password = 'E2e-Password-123!';
const sector = `Setor E2E ${runId}`;
const startDate = '2032-01-01';
const endDate = '2032-12-31';
const pdf = Buffer.from('%PDF-1.4\n%%EOF\n');

test.beforeAll(() => {
  // Seed only prerequisites; the actual data is entered through the admin UI.
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { randomUUID } from 'node:crypto';
    import bcrypt from 'bcrypt';
    import pg from 'pg';

    const [email, password, sector] = process.argv.slice(1);
    const db = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
    await db.connect();
    try {
      await db.query(
        'INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
        [randomUUID(), 'Admin E2E', email, await bcrypt.hash(password, 10), 'ADMIN'],
      );
      await db.query(
        'INSERT INTO "Sector" ("id", "name", "updatedAt") VALUES ($1, $2, NOW())',
        [randomUUID(), sector],
      );
    } finally {
      await db.end();
    }
  `, email, password, sector], {
    cwd: fileURLToPath(new URL('../../backend/', import.meta.url)),
  });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

async function openPublicPage(page: Page, path: string, apiPath: string) {
  const [response] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === apiPath),
    page.goto(path),
  ]);
  expect(response.ok(), `${apiPath}: HTTP ${response.status()}`).toBe(true);
}

test('o indicador só aparece ao público enquanto estiver publicado', async ({ page, browser }) => {
  const name = `Visitantes E2E ${runId}`;
  await page.goto('/admin/indicadores');
  await page.getByRole('button', { name: '+ Novo indicador' }).click();
  await page.getByLabel('Nome', { exact: true }).fill(name);
  await page.getByLabel('Valor', { exact: true }).fill('1234');
  await page.getByLabel('Unidade').fill('visitantes');
  await page.getByLabel('Setor', { exact: true }).selectOption({ label: sector });
  await page.locator('#indicator-start-date').fill(startDate);
  await page.locator('#indicator-end-date').fill(endDate);
  await page.getByRole('button', { name: 'Salvar indicador' }).click();

  const row = page.getByRole('row').filter({ hasText: name });
  const publish = row.getByRole('button', { name: 'Publicar', exact: true });
  await expect(publish).toBeVisible();

  const visitor = await browser.newContext();
  try {
    const publicPage = await visitor.newPage();
    const visit = () => openPublicPage(publicPage, '/indicadores', '/api/indicators/public');
    const card = publicPage.getByRole('article').filter({ hasText: name });
    await visit();
    await expect(publicPage.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
    await expect(card).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await publish.click();
    const unpublish = row.getByRole('button', { name: 'Remover publicação' });
    await expect(unpublish).toBeVisible();
    await visit();
    await publicPage.getByLabel('Setor', { exact: true }).selectOption({ label: sector });
    await publicPage.getByRole('button', { name: 'Aplicar filtros' }).click();
    await expect(card).toContainText('1234 visitantes');

    page.once('dialog', (dialog) => dialog.accept());
    await unpublish.click();
    await expect(publish).toBeVisible();
    await visit();
    await expect(publicPage.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
    await expect(card).toHaveCount(0);
  } finally {
    await visitor.close();
  }
});

test('o relatório publicado aparece com seus metadados e o PDF original', async ({ page, browser }) => {
  const name = `Relatório E2E ${runId}`;
  const description = 'Dados turísticos cadastrados pela administração.';
  await page.goto('/admin/relatorios');
  await page.getByRole('button', { name: '+ Novo relatório' }).click();
  await page.getByLabel('Nome do relatório').fill(name);
  await page.getByLabel('Data inicial').fill(startDate);
  await page.getByLabel('Data final').fill(endDate);
  await page.getByLabel('Setor', { exact: true }).selectOption({ label: sector });
  await page.getByLabel('Descrição').fill(description);
  await page.locator('#report-pdf').setInputFiles({
    name: 'relatorio.pdf',
    mimeType: 'application/pdf',
    buffer: pdf,
  });
  const [created] = await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/reports'),
    page.getByRole('button', { name: 'Salvar', exact: true }).click(),
  ]);
  expect(created.status()).toBe(201);
  const { id, period } = await created.json();

  const row = page.getByRole('row').filter({ hasText: name });
  const publish = row.getByRole('button', { name: 'Publicar', exact: true });
  await expect(publish).toBeVisible();

  const visitor = await browser.newContext();
  try {
    const publicPage = await visitor.newPage();
    const visit = async () => {
      await openPublicPage(publicPage, '/relatorios', '/api/reports');
      await expect(publicPage.getByText('Carregando relatórios...')).toHaveCount(0);
      await expect(publicPage.getByRole('alert')).toHaveCount(0);
    };
    const card = publicPage.getByRole('article').filter({ hasText: name });
    const pdfUrl = `http://localhost:3000/api/reports/${id}/pdf`;
    await visit();
    await expect(card).toHaveCount(0);
    expect((await visitor.request.get(pdfUrl)).status()).toBe(404);

    page.once('dialog', (dialog) => dialog.accept());
    await publish.click();
    const unpublish = row.getByRole('button', { name: 'Remover publicação' });
    await expect(unpublish).toBeVisible();
    await visit();
    await publicPage.getByLabel('Período', { exact: true }).selectOption({ label: period.name });
    await publicPage.getByLabel('Setor', { exact: true }).selectOption({ label: sector });
    await expect(card).toContainText(description);
    await expect(card).toContainText(sector);
    await expect(card).toContainText(period.name);

    const [download] = await Promise.all([
      publicPage.waitForEvent('download'),
      card.getByRole('button', { name: 'Baixar PDF' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`${name}.pdf`);
    expect(await readFile(await download.path())).toEqual(pdf);

    page.once('dialog', (dialog) => dialog.accept());
    await unpublish.click();
    await expect(publish).toBeVisible();
    await visit();
    await expect(card).toHaveCount(0);
    expect((await visitor.request.get(pdfUrl)).status()).toBe(404);
  } finally {
    await visitor.close();
  }
});

import { defineConfig } from '@playwright/test';

const frontendUrl = 'http://localhost:5173';
const apiUrl = 'http://localhost:3000/api';
const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Defina E2E_DATABASE_URL com a URL de um banco descartável já migrado.');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  use: { baseURL: frontendUrl, trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run start:prod',
      cwd: '../backend',
      url: `${apiUrl}/health`,
      env: { DATABASE_URL: databaseUrl, JWT_SECRET: 'e2e-only-test-secret', PORT: '3000' },
    },
    {
      command: 'npm run dev -- --host localhost --port 5173 --strictPort',
      url: frontendUrl,
      env: { VITE_API_URL: apiUrl },
    },
  ],
});

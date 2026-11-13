import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';

// ---- Mocks must be declared before the import of PrismaService ----
// We mock the adapter constructor and the generated PrismaClient so the
// service can be instantiated without touching Postgres or the real client.
const adapterCtor = vi.fn();

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(config: unknown) {
      adapterCtor(config);
    }
  },
}));

const connectMock = vi.fn();
const disconnectMock = vi.fn();

vi.mock('../generated/prisma/client.js', () => ({
  PrismaClient: class {
    $connect = connectMock;
    $disconnect = disconnectMock;
    constructor(public options: unknown) {}
  },
}));

// Import AFTER the mocks so the module graph uses the mocked versions.
const { PrismaService } = await import('./prisma.service.js');

describe('PrismaService', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  // ── constructor ─────────────────────────────────────────────────────
  describe('constructor', () => {
    it('throws when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      expect(() => new PrismaService()).toThrow(
        'DATABASE_URL is not defined',
      );
      expect(adapterCtor).not.toHaveBeenCalled();
    });

    it('throws when DATABASE_URL is an empty string', () => {
      process.env.DATABASE_URL = '';
      expect(() => new PrismaService()).toThrow(
        'DATABASE_URL is not defined',
      );
    });

    it('builds a PrismaPg adapter from DATABASE_URL', () => {
      new PrismaService();

      expect(adapterCtor).toHaveBeenCalledTimes(1);
      expect(adapterCtor).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/test',
      });
    });

    it('passes the adapter to the PrismaClient super constructor', () => {
      const service = new PrismaService();

      // The mocked PrismaClient stores its options on `this`.
      const opts = (service as unknown as { options: any }).options;
      expect(opts).toEqual({ adapter: expect.any(Object) });
      expect(opts.adapter).toBeDefined();
    });
  });

  // ── onModuleInit ────────────────────────────────────────────────────
  describe('onModuleInit', () => {
    it('calls $connect', async () => {
      const service = new PrismaService();

      await service.onModuleInit();

      expect(connectMock).toHaveBeenCalledTimes(1);
    });

    it('propagates a $connect failure', async () => {
      const service = new PrismaService();
      connectMock.mockRejectedValueOnce(new Error('boom'));

      await expect(service.onModuleInit()).rejects.toThrow('boom');
    });
  });

  // ── onModuleDestroy ─────────────────────────────────────────────────
  describe('onModuleDestroy', () => {
    it('calls $disconnect', async () => {
      const service = new PrismaService();

      await service.onModuleDestroy();

      expect(disconnectMock).toHaveBeenCalledTimes(1);
    });

    it('propagates a $disconnect failure', async () => {
      const service = new PrismaService();
      disconnectMock.mockRejectedValueOnce(new Error('nope'));

      await expect(service.onModuleDestroy()).rejects.toThrow('nope');
    });
  });

  // ── lifecycle wiring ────────────────────────────────────────────────
  describe('lifecycle', () => {
    it('$connect and $disconnect are independent calls', async () => {
      const service = new PrismaService();

      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(connectMock).toHaveBeenCalledTimes(1);
      expect(disconnectMock).toHaveBeenCalledTimes(1);
    });
  });
});
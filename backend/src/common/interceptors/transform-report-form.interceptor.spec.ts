import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformReportFormInterceptor } from './transform-report-form.interceptor.js';

describe('TransformReportFormInterceptor', () => {
  let interceptor: TransformReportFormInterceptor;

  // Minimal CallHandler — `handle()` is the only method the interceptor uses.
  const makeNext = (): CallHandler => ({
    handle: vi.fn(() => of('passthrough')),
  });

  // Builds an ExecutionContext whose request.body is the supplied object,
  // and returns both so tests can assert on the mutation.
  const makeContext = (body: Record<string, unknown>) => {
    const request = { body };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    interceptor = new TransformReportFormInterceptor();
  });

  // ── published ─────────────────────────────────────────────────────────
  describe('published coercion', () => {
    it('coerces the string "true" to the boolean true', () => {
      const { context, request } = makeContext({ published: 'true' });

      interceptor.intercept(context, makeNext());

      expect(request.body.published).toBe(true);
    });

    it('coerces the string "false" to the boolean false', () => {
      const { context, request } = makeContext({ published: 'false' });

      interceptor.intercept(context, makeNext());

      expect(request.body.published).toBe(false);
    });

    it('leaves a real boolean untouched', () => {
      const { context, request } = makeContext({ published: true });

      interceptor.intercept(context, makeNext());

      expect(request.body.published).toBe(true);
    });

    it('leaves a missing published field untouched', () => {
      const { context, request } = makeContext({});

      interceptor.intercept(context, makeNext());

      expect(request.body).not.toHaveProperty('published');
    });

    it('rejects any other string value with BadRequestException', () => {
      const { context } = makeContext({ published: 'yes' });

      expect(() => interceptor.intercept(context, makeNext())).toThrow(
        BadRequestException,
      );
    });

    it('rejects uppercase "True" (case-sensitive by design)', () => {
      const { context } = makeContext({ published: 'True' });

      expect(() => interceptor.intercept(context, makeNext())).toThrow(
        BadRequestException,
      );
    });

    it('rejects "1" / "0" (not booleans as strings)', () => {
      for (const value of ['1', '0']) {
        const { context } = makeContext({ published: value });
        expect(() => interceptor.intercept(context, makeNext())).toThrow(
          BadRequestException,
        );
      }
    });

    it('does not call next.handle() when published is invalid', () => {
      const { context } = makeContext({ published: 'nope' });
      const next = makeNext();

      try {
        interceptor.intercept(context, next);
      } catch {
        /* expected */
      }

      expect(next.handle).not.toHaveBeenCalled();
    });
  });

  // ── period ────────────────────────────────────────────────────────────
  describe('period JSON parsing', () => {
    it('parses a JSON string into an object', () => {
      const { context, request } = makeContext({
        period: '{"startDate":"2024-01-01","endDate":"2024-12-31"}',
      });

      interceptor.intercept(context, makeNext());

      expect(request.body.period).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });

    it('leaves an already-parsed object untouched', () => {
      const period = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const { context, request } = makeContext({ period });

      interceptor.intercept(context, makeNext());

      expect(request.body.period).toBe(period); // same reference
    });

    it('leaves a missing period field untouched', () => {
      const { context, request } = makeContext({});

      interceptor.intercept(context, makeNext());

      expect(request.body).not.toHaveProperty('period');
    });

    it('rejects malformed JSON with BadRequestException', () => {
      const { context } = makeContext({ period: '{"startDate": ' });

      expect(() => interceptor.intercept(context, makeNext())).toThrow(
        BadRequestException,
      );
    });

    it('rejects an empty string (JSON.parse("") throws)', () => {
      const { context } = makeContext({ period: '' });

      expect(() => interceptor.intercept(context, makeNext())).toThrow(
        BadRequestException,
      );
    });

    it('does not call next.handle() when period is invalid', () => {
      const { context } = makeContext({ period: 'not-json' });
      const next = makeNext();

      try {
        interceptor.intercept(context, next);
      } catch {
        /* expected */
      }

      expect(next.handle).not.toHaveBeenCalled();
    });

    it('parses a JSON string that is not an object (e.g. "null")', () => {
      // JSON.parse('null') === null — the interceptor does not reject this,
      // it just replaces the value. Pin the current behaviour.
      const { context, request } = makeContext({ period: 'null' });

      interceptor.intercept(context, makeNext());

      expect(request.body.period).toBeNull();
    });
  });

  // ── combined / passthrough ────────────────────────────────────────────
  describe('combined transformations', () => {
    it('transforms published and period in the same request', () => {
      const { context, request } = makeContext({
        published: 'true',
        period: '{"startDate":"2024-01-01","endDate":"2024-12-31"}',
      });

      interceptor.intercept(context, makeNext());

      expect(request.body.published).toBe(true);
      expect(request.body.period).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });

    it('passes the next handler result through unchanged', () => {
      const { context } = makeContext({ published: 'true' });
      const next = makeNext();

      const result$ = interceptor.intercept(context, next);

      const values: unknown[] = [];
      result$.subscribe((v) => values.push(v));
      expect(values).toEqual(['passthrough']);
      expect(next.handle).toHaveBeenCalledTimes(1);
    });

    it('calls next.handle exactly once when the body is valid', () => {
      const { context } = makeContext({ published: 'false' });
      const next = makeNext();

      interceptor.intercept(context, next);

      expect(next.handle).toHaveBeenCalledTimes(1);
    });
  });
});
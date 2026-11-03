import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreatePeriodDto } from './create-periods.dto.js';
import { UpdatePeriodDto } from './update-periods.dto.js';

const PERIOD_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: '2024-Q1' },
    startDate: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
    endDate: { type: 'string', format: 'date-time', example: '2024-03-31T23:59:59.000Z' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// ── GET /periods ──────────────────────────────────────────────────────────
export const ApiListPeriods = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List all periods',
      description:
        'Returns every period ordered by creation, including the related `indicators` and `reports` arrays. Public endpoint — no authentication required.',
    }),
    ApiOkResponse({
      description: 'Array of periods',
      schema: {
        type: 'array',
        items: {
          allOf: [
            PERIOD_SCHEMA,
            {
              type: 'object',
              properties: {
                indicators: { type: 'array', items: { type: 'object' } },
                reports: { type: 'array', items: { type: 'object' } },
              },
            },
          ],
        },
      },
    }),
  );

// ── GET /periods/:id ──────────────────────────────────────────────────────
export const ApiFindPeriod = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Find one period by id',
      description:
        'Public endpoint. Includes the related `indicators` and `reports` arrays.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Period id' }),
    ApiOkResponse({
      description: 'The period, with related indicators and reports',
      schema: {
        allOf: [
          PERIOD_SCHEMA,
          {
            type: 'object',
            properties: {
              indicators: { type: 'array', items: { type: 'object' } },
              reports: { type: 'array', items: { type: 'object' } },
            },
          },
        ],
      },
    }),
    ApiNotFoundResponse({ description: 'Period not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );

// ── POST /periods ─────────────────────────────────────────────────────────
export const ApiCreatePeriod = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a period',
      description: `
**Who can call:** \`ADMIN\` only.

\`startDate\` must be **before** \`endDate\`. Both are ISO-8601 date strings
(e.g. \`"2024-01-01T00:00:00.000Z"\` or \`"2024-01-01"\`).
If \`startDate >= endDate\`, the endpoint returns \`400\`.
      `,
    }),
    ApiBody({
      type: CreatePeriodDto,
      examples: {
        quarter: {
          summary: 'Quarter period',
          value: {
            name: '2024-Q1',
            startDate: '2024-01-01',
            endDate: '2024-03-31',
          },
        },
        year: {
          summary: 'Full year period',
          value: {
            name: '2024',
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-12-31T23:59:59.000Z',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Period created',
      schema: PERIOD_SCHEMA,
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiBadRequestResponse({
      description:
        'DTO validation failed, invalid date string, or startDate >= endDate.',
    }),
  );

// ── PATCH /periods/:id ────────────────────────────────────────────────────
export const ApiUpdatePeriod = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a period',
      description: `
**Who can call:** \`ADMIN\` only. All fields are optional.

If \`startDate\` or \`endDate\` is provided (or already present on the row), the
resulting \`startDate\` must still be before \`endDate\`. Otherwise the endpoint
returns \`400\`.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Period id' }),
    ApiBody({
      type: UpdatePeriodDto,
      examples: {
        rename: {
          summary: 'Rename only',
          value: { name: '2024-Q1 (revised)' },
        },
        extend: {
          summary: 'Extend the end date',
          value: { endDate: '2024-04-30T23:59:59.000Z' },
        },
      },
    }),
    ApiOkResponse({
      description: 'Updated period',
      schema: PERIOD_SCHEMA,
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiNotFoundResponse({ description: 'Period not found' }),
    ApiBadRequestResponse({
      description:
        'Invalid UUID, DTO validation failed, or startDate >= endDate after the update.',
    }),
  );

// ── DELETE /periods/:id ───────────────────────────────────────────────────
export const ApiDeletePeriod = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete a period',
      description: `
**Who can call:** \`ADMIN\` only.

Returns \`409\` if the period still has related indicators or reports (foreign key constraint). Detach or delete them first.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Period id' }),
    ApiOkResponse({
      description: 'Period deleted',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          id: { type: 'string', format: 'uuid' },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiNotFoundResponse({ description: 'Period not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
    ApiConflictResponse({
      description:
        'Period has related indicators or reports (foreign key constraint).',
    }),
  );
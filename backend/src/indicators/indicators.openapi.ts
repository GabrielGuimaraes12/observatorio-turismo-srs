import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateIndicatorDto } from './create-indicators.dto.js';
import { UpdateIndicatorDto } from './update-indicators.dto.js';

const INDICATOR_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Número de visitantes' },
    description: {
      type: 'string',
      nullable: true,
      example: 'Total de visitantes no período',
    },
    value: { type: 'number', example: 12500 },
    unit: { type: 'string', nullable: true, example: 'pessoas' },
    published: { type: 'boolean', example: false },
    sectorId: { type: 'string', format: 'uuid' },
    periodId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    sector: { type: 'object', nullable: true },
    period: { type: 'object', nullable: true },
  },
};

// ── GET /indicators ───────────────────────────────────────────────────────
export const ApiListIndicators = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List all indicators',
      description:
        'Returns every indicator ordered by creation, including the related `sector` and `period` when present. Public endpoint — no authentication required.',
    }),
    ApiOkResponse({
      description: 'Array of indicators',
      schema: { type: 'array', items: INDICATOR_SCHEMA },
    }),
  );

// ── GET /indicators/:id ───────────────────────────────────────────────────
export const ApiFindIndicator = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Find one indicator by id',
      description:
        'Public endpoint. Includes the related `sector` and `period`.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Indicator id' }),
    ApiOkResponse({
      description: 'The indicator',
      schema: INDICATOR_SCHEMA,
    }),
    ApiNotFoundResponse({ description: 'Indicator not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );

// ── POST /indicators ──────────────────────────────────────────────────────
export const ApiCreateIndicator = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create an indicator',
      description: `
**Who can call:** \`ADMIN\` only.

\`sectorId\` and \`periodId\` are required and must reference existing rows.
If either id does not exist, the endpoint returns \`404\` naming the missing relation.

\`value\` must be \`>= 0\`. \`published\` defaults to \`false\`.
      `,
    }),
    ApiBody({
      type: CreateIndicatorDto,
      examples: {
        full: {
          summary: 'Indicator with description and unit',
          value: {
            name: 'Número de visitantes',
            description: 'Total de visitantes no período',
            value: 12500,
            unit: 'pessoas',
            published: true,
            sectorId: '11111111-1111-4111-8111-111111111111',
            periodId: '22222222-2222-4222-8222-222222222222',
          },
        },
        minimal: {
          summary: 'Minimal indicator (name, value, sector, period)',
          value: {
            name: 'Taxa de ocupação',
            value: 78.5,
            sectorId: '11111111-1111-4111-8111-111111111111',
            periodId: '22222222-2222-4222-8222-222222222222',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Indicator created',
      schema: INDICATOR_SCHEMA,
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiBadRequestResponse({ description: 'DTO validation failed' }),
    ApiNotFoundResponse({
      description: 'sectorId or periodId does not exist',
    }),
  );

// ── PATCH /indicators/:id ─────────────────────────────────────────────────
export const ApiUpdateIndicator = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update an indicator',
      description:
        '**Who can call:** `ADMIN` only. All fields are optional. If `sectorId` or `periodId` is provided, it must reference an existing row.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Indicator id' }),
    ApiBody({
      type: UpdateIndicatorDto,
      examples: {
        valueOnly: {
          summary: 'Update value only',
          value: { value: 14000 },
        },
        publish: {
          summary: 'Publish the indicator',
          value: { published: true },
        },
      },
    }),
    ApiOkResponse({
      description: 'Updated indicator',
      schema: INDICATOR_SCHEMA,
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiNotFoundResponse({
      description: 'Indicator, sectorId, or periodId not found',
    }),
    ApiBadRequestResponse({
      description: 'Invalid UUID or DTO validation failed',
    }),
  );

// ── DELETE /indicators/:id ────────────────────────────────────────────────
export const ApiDeleteIndicator = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete an indicator',
      description: '**Who can call:** `ADMIN` only.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Indicator id' }),
    ApiOkResponse({
      description: 'Indicator deleted',
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
    ApiNotFoundResponse({ description: 'Indicator not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );
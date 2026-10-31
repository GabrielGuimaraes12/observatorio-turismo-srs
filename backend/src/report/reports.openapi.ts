import { applyDecorators } from '@nestjs/common';
import { CreateReportDto } from './create-report.dto.js';
import { UpdateReportDto } from './update-report.dto.js';
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

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'Relatório Anual 2024' },
    description: { type: 'string', nullable: true, example: 'Resumo do ano' },
    fileUrl: { type: 'string', example: 'https://cdn.example.com/report.pdf' },
    published: { type: 'boolean', example: false },
    periodId: { type: 'string', format: 'uuid', nullable: true },
    sectorId: { type: 'string', format: 'uuid', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    period: { type: 'object', nullable: true },
    sector: { type: 'object', nullable: true },
  },
} as const;

// ── GET /reports ──────────────────────────────────────────────────────────
export const ApiListReports = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List all reports',
      description:
        'Returns every report, ordered by `createdAt` descending. Includes the related `period` and `sector` objects when present. Public endpoint — no authentication required.',
    }),
    ApiOkResponse({
      description: 'Array of reports',
      schema: { type: 'array', items: REPORT_SCHEMA },
    }),
  );

// ── GET /reports/:id ──────────────────────────────────────────────────────
export const ApiFindReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Find one report by id',
      description: 'Public endpoint — no authentication required.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id' }),
    ApiOkResponse({ description: 'The report', schema: REPORT_SCHEMA }),
    ApiNotFoundResponse({ description: 'Report not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );

// ── POST /reports ─────────────────────────────────────────────────────────
export const ApiCreateReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a report',
      description: `
**Who can call:** \`ADMIN\` only.

The \`periodId\` and \`sectorId\` fields (when provided) must reference existing rows.
If either id does not exist, the endpoint returns \`404\` naming the missing relation.

\`published\` defaults to \`false\`.
      `,
    }),
    ApiBody({
			type: CreateReportDto,
      examples: {
        publishedReport: {
          summary: 'Published report with period and sector',
          value: {
            title: 'Relatório Anual 2024',
            description: 'Resumo do ano',
            fileUrl: 'https://cdn.example.com/report.pdf',
            published: true,
            periodId: '11111111-1111-4111-8111-111111111111',
            sectorId: '22222222-2222-4222-8222-222222222222',
          },
        },
        draftReport: {
          summary: 'Minimal draft (title + fileUrl only)',
          value: {
            title: 'Rascunho',
            fileUrl: 'https://cdn.example.com/draft.pdf',
          },
        },
      },
    }),
    ApiCreatedResponse({ description: 'Report created', schema: REPORT_SCHEMA }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiBadRequestResponse({ description: 'DTO validation failed' }),
    ApiNotFoundResponse({ description: 'periodId or sectorId does not exist' }),
  );

// ── PATCH /reports/:id ────────────────────────────────────────────────────
export const ApiUpdateReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a report',
      description: `
**Who can call:** \`ADMIN\` only.

All fields are optional. Sending \`undefined\` leaves a field untouched; sending \`null\` for \`periodId\`/\`sectorId\` clears the relation.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id' }),
    ApiBody({
			type: UpdateReportDto,
      examples: {
        rename: {
          summary: 'Rename only',
          value: { title: 'Renamed report' },
        },
        publish: {
          summary: 'Publish and attach to a sector',
          value: {
            published: true,
            sectorId: '22222222-2222-4222-8222-222222222222',
          },
        },
      },
    }),
    ApiOkResponse({ description: 'Updated report', schema: REPORT_SCHEMA }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiNotFoundResponse({ description: 'Report, periodId, or sectorId not found' }),
    ApiBadRequestResponse({ description: 'Invalid UUID or DTO validation failed' }),
  );

// ── DELETE /reports/:id ───────────────────────────────────────────────────
export const ApiDeleteReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete a report',
      description: '**Who can call:** `ADMIN` only.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id' }),
    ApiOkResponse({
      description: 'Report deleted',
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
    ApiNotFoundResponse({ description: 'Report not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );
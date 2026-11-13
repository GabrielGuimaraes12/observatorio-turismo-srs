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
  ApiConsumes,
} from '@nestjs/swagger';

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'Relatório Anual 2024' },
    description: {
      type: 'string',
      nullable: true,
      example: 'Resumo do ano',
    },
    fileUrl: {
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000.pdf',
      description: 'Internal PDF reference. Access the file through GET /reports/{id}/pdf.',
    },
    published: { type: 'boolean', example: false },
    periodId: { type: 'string', format: 'uuid', nullable: true },
    authorId: {
      type: 'string',
      format: 'uuid',
      nullable: true,
      description: 'The user who created the report.',
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    period: {
      type: 'object',
      nullable: true,
      description: 'The related period, or null if not attached.',
    },
    author: {
      type: 'object',
      nullable: true,
      description:
        'The author (id, name, email), or null if the report has no author on record.',
    },
  },
};

// ── GET /reports ──────────────────────────────────────────────────────────
export const ApiListReports = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List reports visible to the caller',
      description: `
Returns reports ordered by createdAt descending (most recent first).

**Visibility rules:**

- **Anonymous, USER, HR** — only published reports.
- **ADMIN** — all reports, including drafts.
- **BUSINESS** — published reports plus **their own drafts** (reports they authored that are not yet published). They do not see drafts from other businesses.

To use ADMIN or BUSINESS visibility, include a valid bearer token in the request. Requests without a token are handled as anonymous and receive only published reports.

Each report includes the related period and author when present, or null if not attached.

Public endpoint — authentication is optional and only affects visibility.
      `,
    }),
    ApiOkResponse({
      description: 'Array of reports visible to the caller.',
      schema: { type: 'array', items: REPORT_SCHEMA },
    }),
  );

// ── GET /reports/:id ──────────────────────────────────────────────────────
export const ApiFindReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Find one report by id',
      description: `
Returns a single report with its related period and author.

**Draft visibility:** a report with published = false is returned to ADMIN or to the BUSINESS that authored it. For every other caller, a draft returns the same 404 as a non-existent id — this avoids confirming that a draft with that id exists.

Published reports are returned to any caller.

Public endpoint — authentication is optional and only affects visibility.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id.' }),
    ApiOkResponse({
      description: 'The report, with related period and author.',
      schema: REPORT_SCHEMA,
    }),
    ApiNotFoundResponse({
      description:
        'Report not found, or the caller cannot view this draft.',
    }),
    ApiBadRequestResponse({ description: 'id is not a valid UUID.' }),
  );

// ── POST /reports ─────────────────────────────────────────────────────────
export const ApiCreateReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a report',
      description: `
**Who can call:** ADMIN or BUSINESS.

The request must use multipart/form-data and include a PDF file in the "file" field.

**File requirements:**
- PDF format only.
- Maximum size: 10 MB.
- The backend generates the file reference automatically.

The period field, when provided, must contain a valid JSON string representing the report period.

The published field accepts the strings "true" or "false". It defaults to false.

BUSINESS requests with published: true are rejected with 403.

The authorId is set automatically from the caller's token. It cannot be chosen by the client.
      `,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['title', 'file'],
        properties: {
          title: {
            type: 'string',
            example: 'Relatório Anual 2024',
          },
          description: {
            type: 'string',
            example: 'Resumo do ano',
          },
          file: {
            type: 'string',
            format: 'binary',
            description: 'PDF file (maximum 10 MB).',
          },
          published: {
            type: 'string',
            enum: ['true', 'false'],
            example: 'false',
          },
          period: {
            type: 'string',
            example: '{"startDate":"2024-01-01","endDate":"2024-12-31"}',
            description: 'JSON string containing startDate and endDate.',
          },
          sectorId: {
            type: 'string',
            format: 'uuid',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description:
        'Report created. The authorId is set from the caller automatically.',
      schema: REPORT_SCHEMA,
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid bearer token, or deactivated account.',
    }),
    ApiForbiddenResponse({
      description: 'Caller is not ADMIN or BUSINESS.',
    }),
    ApiBadRequestResponse({
      description: 'DTO validation failed or PDF file is invalid.',
    }),
    ApiNotFoundResponse({
      description: 'The referenced period or sector does not exist.',
    }),
  );

// ── PATCH /reports/:id ────────────────────────────────────────────────────
export const ApiUpdateReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a report',
      description: `
**Who can call:** ADMIN only.

The request must use multipart/form-data.

All fields are optional. Omitting a field leaves it unchanged.

**PDF file:**
- The "file" field is optional.
- Only PDF files are accepted.
- Maximum size: 10 MB.
- If no new file is sent, the existing PDF is preserved.
- If a new file is sent, it replaces the previous PDF.

The period field, when provided, must contain a valid JSON string representing the report period.

The published field accepts the strings "true" or "false".

**Publishing a draft:** set published to "true" to make a draft visible on the public list.

**Clearing the period:** send a period value representing the desired update according to the API's period handling. Omitting the field leaves it unchanged.

The authorId cannot be changed by the client.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id.' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            example: 'Relatório Anual Atualizado',
          },
          description: {
            type: 'string',
            example: 'Resumo atualizado do ano',
          },
          file: {
            type: 'string',
            format: 'binary',
            description: 'Optional PDF file (maximum 10 MB).',
          },
          published: {
            type: 'string',
            enum: ['true', 'false'],
            example: 'true',
          },
          period: {
            type: 'string',
            example: '{"startDate":"2024-01-01","endDate":"2024-12-31"}',
            description: 'JSON string containing startDate and endDate.',
          },
          sectorId: {
            type: 'string',
            format: 'uuid',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Report updated.',
      schema: REPORT_SCHEMA,
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid bearer token, or deactivated account.',
    }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN.' }),
    ApiNotFoundResponse({
      description:
        'Report not found, or the provided period or sector does not exist.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid UUID, DTO validation failed, or PDF file is invalid.',
    }),
  );

// ── DELETE /reports/:id ───────────────────────────────────────────────────
export const ApiDeleteReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete a report',
      description: `
**Who can call:** ADMIN only.

Permanently deletes a report. The row is removed from the database and cannot be recovered. The report's period is unaffected — only the report row is deleted, not the period it referenced.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id.' }),
    ApiOkResponse({
      description: 'Report deleted.',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          id: { type: 'string', format: 'uuid' },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid bearer token, or deactivated account.',
    }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN.' }),
    ApiNotFoundResponse({ description: 'Report not found.' }),
    ApiBadRequestResponse({ description: 'id is not a valid UUID.' }),
  );
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
    description: {
      type: 'string',
      nullable: true,
      example: 'Resumo do ano',
    },
    fileUrl: {
      type: 'string',
      example: 'https://cdn.example.com/report.pdf',
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

- **Anonymous, USER, ADMIN, HR** — only published reports.
- **BUSINESS** — published reports plus **their own drafts** (reports they authored that are not yet published). They do not see drafts from other businesses.

To be treated as a BUSINESS, include a valid bearer token in the request. Requests without a token are handled as anonymous and receive only published reports.

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

**Draft visibility:** a report with published = false is returned only if the caller is the BUSINESS that authored it. For every other caller (including anonymous and ADMIN), a draft returns the same 404 as a non-existent id — this avoids confirming that a draft with that id exists.

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
        'Report not found, or the report is a draft and the caller is not its author.',
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

The periodId field (when provided) must reference an existing row — if it does not, the endpoint returns 404 naming the missing relation.

The published field defaults to false. A report created with published: false is a draft: it is not visible on the public list, but the author (if a BUSINESS) can still see it via GET /reports and GET /reports/:id.

The authorId is set automatically from the caller's token. It cannot be chosen by the client.
      `,
    }),
    ApiBody({
      type: CreateReportDto,
      examples: {
        publishedReport: {
          summary: 'Published report with a period',
          value: {
            title: 'Relatório Anual 2024',
            description: 'Resumo do ano',
            fileUrl: 'https://cdn.example.com/report.pdf',
            published: true,
            periodId: '11111111-1111-4111-8111-111111111111',
          },
        },
        draftReport: {
          summary: 'Minimal draft (title and fileUrl only)',
          value: {
            title: 'Rascunho',
            fileUrl: 'https://cdn.example.com/draft.pdf',
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
    ApiBadRequestResponse({ description: 'DTO validation failed.' }),
    ApiNotFoundResponse({
      description: 'periodId does not reference an existing period.',
    }),
  );

// ── PATCH /reports/:id ────────────────────────────────────────────────────
export const ApiUpdateReport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a report',
      description: `
**Who can call:** ADMIN only.

All fields are optional. Omitting a field leaves it untouched.

**Publishing a draft:** set published: true to make a draft visible on the public list. Any ADMIN can publish any draft — the authorId is not checked on update.

**Clearing the period:** sending periodId: null detaches the relation. Sending undefined (or omitting the field) leaves it as-is.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Report id.' }),
    ApiBody({
      type: UpdateReportDto,
      examples: {
        rename: {
          summary: 'Rename only',
          value: { title: 'Renamed report' },
        },
        publish: {
          summary: 'Publish the report',
          value: { published: true },
        },
        detachPeriod: {
          summary: 'Detach the period (clear the relation)',
          value: { periodId: null },
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
        'Report not found, or the provided periodId does not exist.',
    }),
    ApiBadRequestResponse({
      description: 'Invalid UUID or DTO validation failed.',
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
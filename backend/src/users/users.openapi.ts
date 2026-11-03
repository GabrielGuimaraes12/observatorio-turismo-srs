import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const USER_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Alice' },
    email: { type: 'string', format: 'email', example: 'alice@example.com' },
    role: {
      type: 'string',
      enum: ['USER', 'BUSINESS', 'ADMIN', 'HR'],
      example: 'BUSINESS',
    },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

// ── GET /users?role=<ROLE> ────────────────────────────────────────────────
export const ApiListUsers = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List users by role',
      description: `
**Who can call:** \`HR\` and \`ADMIN\`.

**Permission matrix:**

| Caller | Can list |
|---|---|
| \`HR\` | \`HR\`, \`ADMIN\`, \`BUSINESS\`, \`USER\` |
| \`ADMIN\` | \`BUSINESS\`, \`USER\` |
| \`BUSINESS\`, \`USER\` | (none — 403) |

The \`role\` query parameter is **required**. Omitting it returns \`400\`.

**No pagination** — the full list is returned in one response.

**No filter by \`isActive\`** — active and inactive users are mixed. Filter client-side if you need to separate them.
      `,
    }),
    ApiQuery({
      name: 'role',
      required: true,
      enum: ['HR', 'ADMIN', 'BUSINESS', 'USER'],
      description:
        'The role to list. Must be one the caller is allowed to see (see permission matrix in the description).',
      example: 'BUSINESS',
    }),
    ApiOkResponse({
      description: 'Array of users with the requested role',
      schema: { type: 'array', items: USER_SUMMARY_SCHEMA },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({
      description:
        'Caller is not HR/ADMIN, or is an ADMIN requesting a role other than BUSINESS/USER.',
    }),
    ApiBadRequestResponse({
      description: '`role` query parameter is missing or invalid.',
    }),
  );

// ── DELETE /users/:id ─────────────────────────────────────────────────────
export const ApiDeactivateUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Deactivate a user',
      description: `
**Who can call:** \`HR\` and \`ADMIN\` (with per-role restrictions).

**Permission matrix:**

| Caller | Can deactivate |
|---|---|
| \`HR\` | \`HR\`, \`ADMIN\`, \`BUSINESS\`, \`USER\` (except self, except last active HR) |
| \`ADMIN\` | \`BUSINESS\`, \`USER\` |
| \`BUSINESS\`, \`USER\` | (none — 403) |

**Effect:**
- The user cannot log in anymore (\`401\` on \`POST /auth/login\`).
- Any JWT the user still holds stops working on the next guarded request (\`401\`).
- The account is **not deleted** — data, change logs, and any references remain intact. Use \`PATCH /users/:id/activate\` to reverse.

**Guardrails:**
- \`HR\` cannot deactivate **themselves** (\`403\`).
- \`HR\` cannot deactivate the **last active HR** (\`409\`).
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'User id' }),
    ApiOkResponse({
      description: 'User deactivated',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          id: { type: 'string', format: 'uuid' },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({
      description:
        'Caller lacks permission, is not allowed to deactivate this role, or is trying to deactivate themselves.',
    }),
    ApiNotFoundResponse({ description: 'User not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
    ApiConflictResponse({
      description:
        'User is already deactivated, or this is the last active HR.',
    }),
  );

// ── PATCH /users/:id/activate ─────────────────────────────────────────────
export const ApiReactivateUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Reactivate a deactivated user',
      description: `
**Who can call:** \`HR\` and \`ADMIN\` (with per-role restrictions).

**Permission matrix:** same as \`DELETE /users/:id\`.

**Effect:** the user can log in and use the API again. Their role and data are unchanged.

**Note:** reactivation makes the HR pool larger, so the "last active HR" guardrail does **not** apply here.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'User id' }),
    ApiOkResponse({
      description: 'User reactivated',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          id: { type: 'string', format: 'uuid' },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({
      description: 'Caller lacks permission, or is not allowed to reactivate this role.',
    }),
    ApiNotFoundResponse({ description: 'User not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
    ApiConflictResponse({ description: 'User is already active.' }),
  );
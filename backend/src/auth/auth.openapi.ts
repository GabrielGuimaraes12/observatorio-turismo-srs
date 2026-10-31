import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';

const AUTH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    token: {
      type: 'string',
      description:
        'JWT. Send as `Authorization: Bearer <token>` on guarded routes.',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', example: 'Alice' },
        email: { type: 'string', example: 'alice@example.com' },
        role: {
          type: 'string',
          enum: ['USER', 'BUSINESS', 'ADMIN', 'HR'],
          example: 'USER',
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};

// ── POST /auth/register ───────────────────────────────────────────────────
export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new account',
      description: `
**Two modes, decided by \`invitationToken\`:**

1. **No token (or empty string)** → creates a \`USER\` account.
2. **Valid token** → creates an account with the role attached to the invitation (\`ADMIN\`, \`BUSINESS\`, or \`HR\`).

The client **cannot** choose its own role. Sending a \`role\` field returns \`400\` — the global whitelist rejects unknown properties.

An invalid, expired, or already-used invitation token returns \`403\` **without creating the account and without consuming the token**. The invitee can retry with the correct email, or request a new invitation.

An empty string \`invitationToken: ""\` is normalized to "absent" — it does not attempt to consume anything.
      `,
    }),
    ApiBody({
      type: UserCreateDto,
      examples: {
        selfRegister: {
          summary: 'Self-register as USER (no token)',
          value: {
            name: 'Alice',
            email: 'alice@example.com',
            password: 'Passw0rd!',
          },
        },
        selfRegisterEmptyToken: {
          summary: 'Self-register as USER (empty token)',
          value: {
            name: 'Alice',
            email: 'alice@example.com',
            password: 'Passw0rd!',
            invitationToken: '',
          },
        },
        invitedRegister: {
          summary: 'Accept an invitation (token from POST /invitations)',
          value: {
            name: 'Bob',
            email: 'bob@smcelt.gov.br',
            password: 'Passw0rd!',
            invitationToken: 'Kx7vB2qN9pR4mL8tY6wZ1aC5sD3fG0hJ',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description:
        'Account created. The `role` comes from the invitation, or `USER` if no token was provided.',
      schema: AUTH_RESPONSE_SCHEMA,
    }),
    ApiBadRequestResponse({
      description:
        'DTO validation failed (missing fields, weak password, unknown property such as `role`, or invalid email).',
    }),
    ApiForbiddenResponse({
      description:
        '`invitationToken` is invalid, expired, already used, or does not match the provided email. No account was created and the token was not consumed.',
    }),
    ApiConflictResponse({
      description: 'Email already registered.',
    }),
  );

// ── POST /auth/login ──────────────────────────────────────────────────────
export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Log in',
      description: `
Returns a JWT and the user. The token is the same value the frontend sends on every guarded request.

**Note on deactivated accounts:** a deactivated account receives the same \`401\` "Invalid credentials" as a wrong password. The API does not distinguish them, to prevent email enumeration. The frontend should treat any \`401\` from this endpoint identically.
      `,
    }),
    ApiBody({
      type: UserLoginDto,
      examples: {
        default: {
          summary: 'Valid credentials',
          value: { email: 'alice@example.com', password: 'Passw0rd!' },
        },
      },
    }),
    ApiOkResponse({
      description: 'Login succeeded.',
      schema: AUTH_RESPONSE_SCHEMA,
    }),
    ApiBadRequestResponse({
      description: 'DTO validation failed (missing password, invalid email).',
    }),
    ApiUnauthorizedResponse({
      description:
        'Invalid credentials **or** deactivated account. The API does not distinguish them.',
    }),
  );
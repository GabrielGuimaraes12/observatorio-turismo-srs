import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

export const ApiCreateInvitation = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create an invitation',
      description: `
Returns the token in plaintext **once**. Never returned again from \`GET /invitations\`.

**Who can call:** HR → HR/ADMIN, ADMIN → BUSINESS.

**Errors:** 400 invalid role, 403 role not permitted, 409 email taken/pending invite.
      `,
    }),
    ApiBody({
      description: 'Invitation payload',
      examples: {
        inviteAdmin: {
          summary: 'HR invites a new ADMIN',
          value: { email: 'newadmin@smcelt.gov.br', role: 'ADMIN' },
        },
        inviteHr: {
          summary: 'HR invites another HR',
          value: { email: 'newhr@smcelt.gov.br', role: 'HR' },
        },
        inviteBusiness: {
          summary: 'ADMIN invites a BUSINESS',
          value: { email: 'owner@restaurant.com', role: 'BUSINESS' },
        },
      },
    }),
    ApiCreatedResponse({ description: 'Invitation created. Token returned once.' }),
    ApiForbiddenResponse({ description: 'Requester role cannot invite this role' }),
    ApiConflictResponse({ description: 'Email taken or pending invite exists' }),
    ApiBadRequestResponse({ description: 'Invalid role' }),
  );

export const ApiListInvitations = () =>
  applyDecorators(
    ApiOperation({ summary: 'List my pending invitations' }),
    ApiOkResponse({ description: 'Array of pending invitations (no token field)' }),
    ApiForbiddenResponse({ description: 'Requester lacks permission' }),
  );

export const ApiRevokeInvitation = () =>
  applyDecorators(
    ApiOperation({ summary: 'Revoke a pending invitation' }),
    ApiOkResponse({ description: 'Invitation revoked' }),
    ApiForbiddenResponse({ description: 'Invitation not created by requester' }),
    ApiNotFoundResponse({ description: 'Invitation not found or already used' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );

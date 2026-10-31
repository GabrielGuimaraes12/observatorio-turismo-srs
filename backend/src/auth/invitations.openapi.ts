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
	ApiUnauthorizedResponse,
	ApiParam,
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
			ApiOperation({
				summary: 'List my pending invitations',
				description: `
	Returns invitations **created by the authenticated user** that are still pending — meaning not used and not expired.
	
	**Scope:**
	- HR sees only invitations they created.
	- ADMIN sees only invitations they created.
	- There is no endpoint to see all invitations across users.
	
	**The token is not returned by this endpoint.** It was shown exactly once in the POST /invitations response and cannot be retrieved again. If an invitee needs a new copy, the current invitation must be **revoked** (DELETE /invitations/:id) and a **new one created** (POST /invitations).
	
	**Filtering (server-side):**
	- Used invitations are excluded.
	- Expired invitations are excluded.
				`,
			}),
			ApiOkResponse({
				description:
					'Array of pending invitations. The token field is intentionally absent — the plaintext token exists only in the creation response.',
				schema: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								format: 'uuid',
								description: 'Invitation id. Use this for revoke.',
							},
							email: {
								type: 'string',
								format: 'email',
								description: 'The email address the invitation is bound to.',
								example: 'newadmin@smcelt.gov.br',
							},
							role: {
								type: 'string',
								enum: ['HR', 'ADMIN', 'BUSINESS'],
								description: 'The role that will be assigned when the invitee registers.',
								example: 'ADMIN',
							},
							expiresAt: {
								type: 'string',
								format: 'date-time',
								description:
									'After this, the invitation is no longer valid and disappears from this list.',
								example: '2024-11-20T14:30:00.000Z',
							},
							createdAt: {
								type: 'string',
								format: 'date-time',
								description: 'When the invitation was issued.',
								example: '2024-11-13T14:30:00.000Z',
							},
						},
					},
				},
			}),
			ApiForbiddenResponse({
				description: 'Caller is not HR or ADMIN.',
			}),
			ApiUnauthorizedResponse({
				description: 'Missing or invalid bearer token, or deactivated account.',
			}),
		);
	
	export const ApiRevokeInvitation = () =>
		applyDecorators(
			ApiOperation({
				summary: 'Revoke a pending invitation',
				description: `
	Permanently deletes a pending invitation. **The token stops working immediately** — any attempt to register with it after this call returns 403.
	
	**Who can call:**
	- The user who created the invitation (whether HR or ADMIN).
	- An HR can only revoke invitations they created — not another HR's.
	- Attempting to revoke someone else's invitation returns **403**.
	
	**What "pending" means here:** the invitation has not been used and has not expired. Attempting to revoke an already-used invitation returns **404** — the row was consumed and cannot be revoked.
	
	**Difference from an expired invitation:** an expired invitation is not "revoked" — it just stops appearing in GET /invitations and stops being accepted by the register endpoint. This endpoint is for proactively cancelling an invitation that would otherwise still be valid.
				`,
			}),
			ApiParam({
				name: 'id',
				format: 'uuid',
				description:
					'Invitation id, as returned by POST /invitations or GET /invitations.',
			}),
			ApiOkResponse({
				description: 'Invitation revoked and removed from the database.',
				schema: {
					type: 'object',
					properties: {
						success: { type: 'boolean', example: true },
						id: {
							type: 'string',
							format: 'uuid',
							example: '8f3a2b1c-4d5e-4f6a-9b7c-8d9e0f1a2b3c',
						},
					},
				},
			}),
			ApiUnauthorizedResponse({
				description: 'Missing or invalid bearer token, or deactivated account.',
			}),
			ApiForbiddenResponse({
				description:
					'Caller is not HR/ADMIN, or the invitation was created by a different user.',
			}),
			ApiNotFoundResponse({
				description:
					'Invitation does not exist, or has already been used (consumed invitations cannot be revoked).',
			}),
			ApiBadRequestResponse({
				description: 'id is not a valid UUID.',
			}),
		);
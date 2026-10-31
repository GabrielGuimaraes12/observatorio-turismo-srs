import { applyDecorators } from '@nestjs/common';
import { CreateSectorDto } from './create-sectors.dto.js';
import { UpdateSectorDto } from './update-sectors.dto.js';
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

const SECTOR_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Turismo' },
    description: { type: 'string', nullable: true, example: 'Setor de turismo' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const ApiListSectors = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List all sectors',
      description:
        'Returns every sector ordered by creation. Public endpoint — no authentication required.',
    }),
    ApiOkResponse({
      description: 'Array of sectors',
      schema: {
        type: 'array',
        items: {
          allOf: [
            SECTOR_SCHEMA,
            {
              type: 'object',
              properties: {
                indicators: { type: 'array', items: { type: 'object' } },
              },
            },
          ],
        },
      },
    }),
  );

export const ApiFindSector = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Find one sector by id',
      description:
        'Public endpoint. Includes the `indicators` array for this sector.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Sector id' }),
    ApiOkResponse({
      description: 'The sector, with its indicators',
      schema: {
        allOf: [
          SECTOR_SCHEMA,
          {
            type: 'object',
            properties: {
              indicators: { type: 'array', items: { type: 'object' } },
            },
          },
        ],
      },
    }),
    ApiNotFoundResponse({ description: 'Sector not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
  );

export const ApiCreateSector = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a sector',
      description: '**Who can call:** `ADMIN` only.',
    }),
    ApiBody({
			type: CreateSectorDto,
			examples: {
				default: {
					summary: 'Sector with description',
					value: { name: 'Turismo', description: 'Setor de turismo' },
				},
				minimal: {
					summary: 'Minimal sector (name only)',
					value: { name: 'Turismo' },
				},
			},
		}),
    ApiCreatedResponse({ description: 'Sector created', schema: SECTOR_SCHEMA }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiBadRequestResponse({ description: 'DTO validation failed' }),
    ApiConflictResponse({
      description: 'A sector with this name already exists',
    }),
  );

export const ApiUpdateSector = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a sector',
      description:
        '**Who can call:** `ADMIN` only. All fields optional.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Sector id' }),
    ApiBody({
			type: UpdateSectorDto,
      examples: {
        rename: {
          summary: 'Rename only',
          value: { name: 'Turismo Sustentável' },
        },
      },
    }),
    ApiOkResponse({ description: 'Updated sector', schema: SECTOR_SCHEMA }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' }),
    ApiForbiddenResponse({ description: 'Caller is not ADMIN' }),
    ApiNotFoundResponse({ description: 'Sector not found' }),
    ApiBadRequestResponse({ description: 'Invalid UUID or DTO validation failed' }),
    ApiConflictResponse({ description: 'Another sector already uses this name' }),
  );

export const ApiDeleteSector = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete a sector',
      description: `
**Who can call:** \`ADMIN\` only.

Returns \`409\` if the sector still has related indicators. Detach or delete the indicators first.
      `,
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'Sector id' }),
    ApiOkResponse({
      description: 'Sector deleted',
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
    ApiNotFoundResponse({ description: 'Sector not found' }),
    ApiBadRequestResponse({ description: 'id is not a UUID' }),
    ApiConflictResponse({
      description: 'Sector has related indicators (foreign key constraint)',
    }),
  );
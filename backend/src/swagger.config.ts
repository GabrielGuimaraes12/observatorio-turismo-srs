import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Observatório do Turismo SRS API')
    .setDescription(
      [
        'API da plataforma do Observatório do Turismo de Santa Rita do Sapucaí.',
        '',
        '## Roles',
        '`USER` < `BUSINESS` = `ADMIN` < `HR`',
        '',
        '- **USER** — public visitor, self-registers via `POST /auth/register`.',
        '- **BUSINESS** — invited by an `ADMIN`. Manages their own content.',
        '- **ADMIN** — invited by an `HR`. Manages `BUSINESS` and `USER` accounts.',
        '- **HR** — highest privilege. Manages everything, including other `HR`s.',
        '',
        '## Authentication',
        'Guarded routes require `Authorization: Bearer <jwt>`.',
        'Any `401` means: invalid token, expired token, or deactivated account.',
        'Redirect to login. The API does not distinguish between them.',
        '',
        '## Errors',
        '| Status | Meaning |',
        '|---|---|',
        '| 400 | Validation failed. `message` is `string[]`. |',
        '| 401 | Auth failure. Redirect to login. |',
        '| 403 | Authenticated but insufficient role. |',
        '| 404 | Resource not found. |',
        '| 409 | Conflict (duplicate, already-active/deactivated, last-HR). |',
        '',
        '## Not implemented',
        '- No pagination on any list endpoint.',
        '- No `PATCH /users/:id/role`. Role changes require a new invitation.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT-auth',
    )
    .addTag('Auth', 'Registration and login')
    .addTag('Invitations', 'Create, list, and revoke invitations')
    .addTag('Users', 'List, deactivate, reactivate users (HR and ADMIN only)')
    .addTag('Reports', 'Public read, ADMIN-managed writes')
    .addTag('Sectors', 'Public read, ADMIN-managed writes')
    .addTag('Periods', 'Public read, ADMIN-managed writes')
    .addTag('Indicators', 'Public read, ADMIN-managed writes')
    .addTag('Health', 'Health check')
    .build();
}
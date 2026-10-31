import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { CreateInvitationDto } from './auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';

interface AuthedRequest {
  user: { id: string; role: string };
}

@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationService) {}

  @Post()
  @Roles('HR', 'ADMIN')
  create(@Body() body: CreateInvitationDto, @Req() req: AuthedRequest) {
    if (req.user.role === 'ADMIN' && body.role !== 'BUSINESS') {
      throw new ForbiddenException('Admins can only invite BUSINESS accounts');
    }
    if (req.user.role === 'HR' && body.role === 'BUSINESS') {
      // HR does not manage businesses — admins do.
      throw new ForbiddenException('Only admins can invite BUSINESS accounts');
    }
    return this.invitations.create({
      email: body.email,
      role: body.role,
      createdById: req.user.id,
    });
  }

  @Get()
  @Roles('HR', 'ADMIN')
  list(@Req() req: AuthedRequest) {
    return this.invitations.listFor(req.user.id);
  }

  @Delete(':id')
  @Roles('HR', 'ADMIN')
  revoke(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.invitations.revoke(id, req.user.id);
  }
}

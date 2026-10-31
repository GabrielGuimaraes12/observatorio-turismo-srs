import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { ListUsersQueryDto } from './list-users.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

interface AuthedRequest {
  user: { id: string; role: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('HR', 'ADMIN')
  list(@Query() query: ListUsersQueryDto, @Req() req: AuthedRequest) {
    return this.users.listFor(req.user.role, query.role);
  }

  @Delete(':id')
  @Roles('HR', 'ADMIN')
  deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.users.deactivate(id, req.user);
  }

  @Patch(':id/activate')
  @Roles('HR', 'ADMIN')
  reactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.users.reactivate(id, req.user);
  }
}

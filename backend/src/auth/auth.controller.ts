import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: UserCreateDto) {
    return this.authService.register(body.name, body.email, body.password);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: UserLoginDto) {
    try {
      return await this.authService.login(body.email, body.password);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }
  }

  // ToDo -> remove this and add a secure way to make user admin
  
  @Patch('promote/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  promote(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.authService.promoteToAdmin(id);
  }
}

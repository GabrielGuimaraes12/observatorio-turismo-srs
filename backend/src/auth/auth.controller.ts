import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';

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
  promote(@Param('id', new ParseUUIDPipe()) id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return this.authService.promoteToAdmin(id);
  }
}

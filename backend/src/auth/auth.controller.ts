import {
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: UserCreateDto) {
    return this.authService.register(
      body.name,
      body.email,
      body.password,
      body.invitationToken,
    );
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: UserLoginDto) {
    return this.authService.login(body.email, body.password);
  }
}

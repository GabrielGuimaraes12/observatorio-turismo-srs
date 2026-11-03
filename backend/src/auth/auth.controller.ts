import {
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';
import { ApiRegister, ApiLogin } from './auth.openapi.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiRegister()
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
  @ApiLogin()
  login(@Body() body: UserLoginDto) {
    return this.authService.login(body.email, body.password);
  }
}
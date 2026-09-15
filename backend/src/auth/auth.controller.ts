import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserCreateDto, UserLoginDto } from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: UserCreateDto) {
    try {
      return await this.authService.register(body.name, body.email, body.password);
    } catch (e) {
			console.error('Error on register:', e);
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: UserLoginDto) {
    try {
      return await this.authService.login(body.email, body.password);
    } catch (e) {
			console.error('Error on login:', e);
      throw new UnauthorizedException((e as Error).message);
    }
  }
}
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';

import { AuthController } from './auth.controller.js';
import { InvitationsController } from './invitations.controller.js';
import { AuthService } from './auth.service.js';
import { InvitationService } from './invitation.service.js';
import { HrBootstrapService } from './hr-bootstrap.service.js';
import { JwtTokenService } from './jwt.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController, InvitationsController],
  providers: [
    AuthService,
    InvitationService,
    HrBootstrapService,
    JwtTokenService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    JwtTokenService,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
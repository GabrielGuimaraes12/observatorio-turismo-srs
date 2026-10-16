import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtTokenService } from '../auth/jwt.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SectorController } from './sectors.controller.js';
import { SectorService } from './sectors.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SectorController],
  providers: [
    SectorService,
    PrismaService,
    JwtTokenService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class SectorModule {}
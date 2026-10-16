import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ReportsModule } from './report/reports.module.js';
import { SectorModule } from './sectors/sectors.module.js';
import { PeriodModule } from './periods/periods.module.js';
import { IndicatorModule } from './indicators/indicators.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ReportsModule,
    SectorModule,
    PeriodModule,
    IndicatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
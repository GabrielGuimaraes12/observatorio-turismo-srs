import { Module } from '@nestjs/common';
import { ReportUploadController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { ReportRepository } from './report.repository.js';
import { ReportAccessGuard } from './reports-acess.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportUploadController],
  providers: [ReportsService, ReportRepository, ReportAccessGuard],
  exports: [ReportsService],
})
export class UploadModule {}
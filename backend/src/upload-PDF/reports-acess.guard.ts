import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';

@Injectable()
export class ReportAccessGuard implements CanActivate {
  constructor(private readonly reportsService: ReportsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const report = await this.reportsService.findById(req.params.id);
    if (!report) throw new NotFoundException('Relatório não encontrado.');

    const isAdmin = req.user?.role === 'admin';
    if (!report.published && !isAdmin) {
      throw new ForbiddenException('Acesso negado.');
    }
    return true;
  }
}
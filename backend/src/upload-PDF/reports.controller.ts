import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { pdfMulterOptions } from './multer.config.js';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class ReportUploadController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('pdf', pdfMulterOptions))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('O arquivo PDF é obrigatório.');
    return this.reportsService.createFromFile(file);
  }
}
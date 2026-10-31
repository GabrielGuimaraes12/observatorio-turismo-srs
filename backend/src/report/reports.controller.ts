import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CreateReportDto } from './create-report.dto.js';
import { UpdateReportDto } from './update-report.dto.js';
import { ReportsService } from './reports.service.js';
import {
  ApiListReports,
  ApiFindReport,
  ApiCreateReport,
  ApiUpdateReport,
  ApiDeleteReport,
} from './reports.openapi.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiListReports()
  findAll() {
    return this.reportsService.findAll();
  }

  @Get(':id')
  @ApiFindReport()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reportsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiCreateReport()
  create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiUpdateReport()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiDeleteReport()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reportsService.remove(id);
  }
}
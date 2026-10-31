import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
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

interface AuthedRequest {
  user?: { id: string; role: string };
}

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiListReports()
  findAll(@Req() req: AuthedRequest) {
    return this.reportsService.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiFindReport()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.reportsService.findOne(id, req.user);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'BUSINESS')
  @ApiCreateReport()
  create(@Body() dto: CreateReportDto, @Req() req: AuthedRequest) {
    return this.reportsService.create(dto, req.user!.id);
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
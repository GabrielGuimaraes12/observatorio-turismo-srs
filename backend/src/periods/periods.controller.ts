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
import { CreatePeriodDto } from './create-periods.dto.js';
import { UpdatePeriodDto } from './update-periods.dto.js';
import { PeriodService } from './periods.service.js';
import {
  ApiListPeriods,
  ApiFindPeriod,
  ApiCreatePeriod,
  ApiUpdatePeriod,
  ApiDeletePeriod,
} from './periods.openapi.js';

@ApiTags('Periods')
@Controller('periods')
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

  @Get()
  @ApiListPeriods()
  findAll() {
    return this.periodService.findAll();
  }

  @Get(':id')
  @ApiFindPeriod()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.periodService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiCreatePeriod()
  create(@Body() dto: CreatePeriodDto) {
    return this.periodService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiUpdatePeriod()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePeriodDto,
  ) {
    return this.periodService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiDeletePeriod()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.periodService.remove(id);
  }
}
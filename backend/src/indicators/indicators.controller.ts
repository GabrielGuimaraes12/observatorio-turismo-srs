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
import { CreateIndicatorDto } from './create-indicators.dto.js';
import { UpdateIndicatorDto } from './update-indicators.dto.js';
import { IndicatorService } from './indicators.service.js';
import {
  ApiListIndicators,
  ApiFindIndicator,
  ApiCreateIndicator,
  ApiUpdateIndicator,
  ApiDeleteIndicator,
} from './indicators.openapi.js';

@ApiTags('Indicators')
@Controller('indicators')
export class IndicatorController {
  constructor(private readonly indicatorService: IndicatorService) {}

  @Get()
  @ApiListIndicators()
  findAll() {
    return this.indicatorService.findAll();
  }

  @Get(':id')
  @ApiFindIndicator()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.indicatorService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiCreateIndicator()
  create(@Body() dto: CreateIndicatorDto) {
    return this.indicatorService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiUpdateIndicator()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIndicatorDto,
  ) {
    return this.indicatorService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiDeleteIndicator()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.indicatorService.remove(id);
  }
}
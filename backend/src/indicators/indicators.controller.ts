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
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CreateIndicatorDto } from './create-indicators.dto.js';
import { UpdateIndicatorDto } from './update-indicators.dto.js';
import { IndicatorService } from './indicators.service.js';

@Controller('indicators')
export class IndicatorController {
  constructor(private readonly indicatorService: IndicatorService) {}

  @Get()
  findAll() {
    return this.indicatorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.indicatorService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateIndicatorDto) {
    return this.indicatorService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIndicatorDto,
  ) {
    return this.indicatorService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.indicatorService.remove(id);
  }
}
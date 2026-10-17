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
import { CreateSectorDto } from './create-sectors.dto.js';
import { UpdateSectorDto } from './update-sectors.dto.js';
import { SectorService } from './sectors.service.js';

@Controller('sectors')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Get()
  findAll() {
    return this.sectorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sectorService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateSectorDto) {
    return this.sectorService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSectorDto,
  ) {
    return this.sectorService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sectorService.remove(id);
  }
}
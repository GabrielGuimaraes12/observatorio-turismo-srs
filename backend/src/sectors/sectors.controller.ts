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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiListSectors,
  ApiFindSector,
  ApiCreateSector,
  ApiUpdateSector,
  ApiDeleteSector,
} from './sectors.openapi.js';

@ApiTags('Sectors')
@Controller('sectors')
export class SectorController {
  constructor(private readonly sectorService: SectorService) {}

  @Get()
  @ApiListSectors()
  findAll() {
    return this.sectorService.findAll();
  }

  @Get(':id')
  @ApiFindSector()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sectorService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiCreateSector()
  create(@Body() dto: CreateSectorDto) {
    return this.sectorService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiUpdateSector()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSectorDto,
  ) {
    return this.sectorService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiDeleteSector()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sectorService.remove(id);
  }
}
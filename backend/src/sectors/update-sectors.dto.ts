import { PartialType } from '@nestjs/mapped-types';
import { CreateSectorDto } from './create-sectors.dto.js';

export class UpdateSectorDto extends PartialType(CreateSectorDto) {}

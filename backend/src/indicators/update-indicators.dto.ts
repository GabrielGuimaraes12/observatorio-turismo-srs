import { PartialType } from '@nestjs/mapped-types';
import { CreateIndicatorDto } from './create-indicators.dto.js';

export class UpdateIndicatorDto extends PartialType(CreateIndicatorDto) {}
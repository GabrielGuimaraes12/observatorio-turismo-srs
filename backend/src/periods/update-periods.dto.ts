import { PartialType } from '@nestjs/mapped-types';
import { CreatePeriodDto } from './create-periods.dto.js';

export class UpdatePeriodDto extends PartialType(CreatePeriodDto) {}
import { PartialType } from '@nestjs/mapped-types';
import { CreateReportDto } from './create-report.dto.js';

export class UpdateReportDto extends PartialType(CreateReportDto) {}
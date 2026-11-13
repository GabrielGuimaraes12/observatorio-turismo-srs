import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportPeriodDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class CreateReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportPeriodDto)
  period?: ReportPeriodDto;

  @IsOptional()
  @IsUUID()
  sectorId?: string;
}

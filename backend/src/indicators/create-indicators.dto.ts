import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IndicatorPeriodDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class CreateIndicatorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  value: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsUUID('4')
  @IsNotEmpty()
  sectorId: string;

  @ValidateNested()
  @Type(() => IndicatorPeriodDto)
  period: IndicatorPeriodDto;
}

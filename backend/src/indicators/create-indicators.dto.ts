import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

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

  @IsUUID('4')
  @IsNotEmpty()
  periodId: string;
}
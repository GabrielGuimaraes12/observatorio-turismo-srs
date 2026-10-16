import {
  IsDateString,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
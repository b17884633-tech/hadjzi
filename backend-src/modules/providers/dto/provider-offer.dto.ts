import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateProviderOfferDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  discountPercent: number;

  @IsDateString()
  startsOn: string;

  @IsDateString()
  endsOn: string;
}

export class UpdateProviderOfferDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsDateString()
  startsOn?: string;

  @IsOptional()
  @IsDateString()
  endsOn?: string;
}

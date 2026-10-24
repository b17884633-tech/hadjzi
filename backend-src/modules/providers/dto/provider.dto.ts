import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ProviderStatus } from '../../../common/enums';

export class CreateProviderDto {
  @IsString()
  @MaxLength(150)
  businessName: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsInt()
  regionId?: number;

  @IsOptional()
  @IsString()
  addressDetails?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  @ArrayMaxSize(12)
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  cancellationPolicy?: string;

  /** Facility details shown on the public page (spaces, amenities, terms, …). */
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  cityId?: number;

  @IsOptional()
  @IsInt()
  regionId?: number;

  @IsOptional()
  @IsString()
  addressDetails?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  @ArrayMaxSize(12)
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  cancellationPolicy?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class ReviewProviderDto {
  status: ProviderStatus.APPROVED | ProviderStatus.REJECTED | ProviderStatus.SUSPENDED;
}

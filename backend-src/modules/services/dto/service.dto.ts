import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  providerId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(12)
  images?: string[];
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(12)
  images?: string[];
}

export class CreateAvailabilityDto {
  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  /** AVAILABLE (default) or BLOCKED for provider-closed periods. */
  @IsOptional()
  @IsIn(['AVAILABLE', 'BLOCKED'])
  status?: 'AVAILABLE' | 'BLOCKED';
}

export class UpdateAvailabilityStatusDto {
  @IsIn(['AVAILABLE', 'BLOCKED'])
  status: 'AVAILABLE' | 'BLOCKED';
}

/** Seed hourly slots for fields / clinics (e.g. 08:00–22:00). */
export class SeedHourlyAvailabilityDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  /** Explicit hour starts (0–23). When set, overrides startHour/endHour. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(23, { each: true })
  hours?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCapacity?: number;
}

/** Open bookable all-day slots for a date range (hotels/chalets). */
export class SeedAvailabilityDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(366)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalCapacity?: number;
}

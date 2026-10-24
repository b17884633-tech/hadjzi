import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DisputeStatus } from '../../../common/enums';

export class CreateDisputeDto {
  /** Optional — omit for general app feedback / suggestions. */
  @IsOptional()
  @IsUUID('loose')
  bookingId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  reason: string;
}

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolution?: string;
}

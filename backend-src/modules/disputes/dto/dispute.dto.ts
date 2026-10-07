import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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
  reason: string;
}

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @IsOptional()
  @IsString()
  resolution?: string;
}

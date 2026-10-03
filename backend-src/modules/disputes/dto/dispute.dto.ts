import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DisputeStatus } from '../../../common/enums';

export class CreateDisputeDto {
  @IsUUID('loose')
  bookingId: string;

  @IsString()
  reason: string;
}

export class ResolveDisputeDto {
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @IsOptional()
  @IsString()
  resolution?: string;
}

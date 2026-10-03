import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBookingDto {
  /** 'loose' accepts demo seed IDs that are UUID-shaped but not RFC variant-strict. */
  @IsUUID('loose')
  serviceId: string;

  @IsUUID('loose')
  availabilityId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  customerNotes?: string;
}

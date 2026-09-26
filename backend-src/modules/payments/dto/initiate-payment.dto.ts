import { IsOptional, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  bookingId: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

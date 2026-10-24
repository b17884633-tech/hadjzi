import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Strict calendar date so malformed input can never reach date arithmetic. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateBookingDto {
  /** 'loose' accepts demo seed IDs that are UUID-shaped but not RFC variant-strict. */
  @IsUUID('loose')
  serviceId: string;

  @IsUUID('loose')
  availabilityId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerNotes?: string;

  /**
   * True when the customer finished checkout (e.g. submitted transfer proof).
   * Skips temporary lock so the booking stays PENDING_PAYMENT until payment is confirmed.
   * Also creates an INITIATED payment so admin Wallet can confirm it.
   */
  @IsOptional()
  @IsBoolean()
  paymentSubmitted?: boolean;

  /** Payment channel used at checkout (e.g. TRANSFER, JEEB). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  /** Bank / wallet transfer reference entered by the customer. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transferReference?: string;

  /** When true, payment amount is the full booking total instead of the deposit. */
  @IsOptional()
  @IsBoolean()
  payFull?: boolean;

  /** Exclusive check-out date (YYYY-MM-DD) for multi-night UNIT_DAY stays. */
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  checkOutDate?: string;
}

/** Walk-in / front-desk reservation — confirmed immediately, no payment. */
export class CreateDeskBookingDto {
  @IsUUID('loose')
  serviceId: string;

  /** Check-in / service date (YYYY-MM-DD). */
  @IsString()
  @Matches(ISO_DATE)
  date: string;

  /** Optional exclusive check-out date for multi-night stays. */
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  checkOutDate?: string;

  /** Rooms / units reserved (default 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsString()
  @MaxLength(120)
  guestName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  guestPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

import { BookingStatus } from '../../core/common/types';

export interface BookingProviderInfo {
  id: string;
  businessName: string;
  images?: string[];
  addressDetails?: string | null;
}

export interface BookingServiceInfo {
  id: string;
  name: string;
  images?: string[];
  attributes?: Record<string, unknown>;
  basePrice?: number;
}

export interface BookingCustomerInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string | null;
  providerId: string | null;
  serviceId: string | null;
  bookingDate: string;
  startTime: string | null;
  endTime: string | null;
  quantity: number;
  totalAmount: number;
  depositPercentage: number;
  depositAmount: number;
  remainingAmount: number;
  status: BookingStatus;
  temporaryLockUntil: string | null;
  customerNotes?: string | null;
  createdAt?: string;
  /** Present when the customer already submitted a review for this booking. */
  reviewId?: string | null;
  provider?: BookingProviderInfo | null;
  service?: BookingServiceInfo | null;
  customer?: BookingCustomerInfo | null;
}

export interface CreateBookingPayload {
  serviceId: string;
  availabilityId: string;
  bookingDate?: string;
  /** Exclusive pricing check-out; also blocks this date for chalet capacity. */
  checkOutDate?: string;
  startTime?: string;
  endTime?: string;
  quantity?: number;
  customerNotes?: string;
  /** Customer finished checkout with payment proof — do not auto-expire. */
  paymentSubmitted?: boolean;
  paymentMethod?: string;
  transferReference?: string;
  /** Pay full total instead of deposit only. */
  payFull?: boolean;
}

export interface CreateDeskBookingPayload {
  serviceId: string;
  date: string;
  checkOutDate?: string;
  quantity?: number;
  guestName: string;
  guestPhone?: string;
  notes?: string;
}

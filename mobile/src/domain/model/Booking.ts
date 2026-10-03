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
  provider?: BookingProviderInfo | null;
  service?: BookingServiceInfo | null;
}

export interface CreateBookingPayload {
  serviceId: string;
  availabilityId: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  quantity?: number;
  customerNotes?: string;
}

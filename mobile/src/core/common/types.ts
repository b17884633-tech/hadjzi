export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'REFUNDED';

export type SearchLevel =
  | 'DESTINATION'
  | 'CATEGORY'
  | 'CATEGORY_AND_DESTINATION';

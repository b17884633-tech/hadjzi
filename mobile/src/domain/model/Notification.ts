export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
  providerId?: string;
  kind:
    | 'BOOKING_CREATED'
    | 'BOOKING_PENDING'
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_COMPLETED'
    | 'BOOKING_EXPIRED'
    | 'FACILITY_STATUS'
    | 'GENERAL';
};

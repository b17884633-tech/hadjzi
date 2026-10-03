import { Booking, CreateBookingPayload } from '../model/Booking';

export interface BookingRepository {
  create(payload: CreateBookingPayload): Promise<Booking>;
  listMine(): Promise<Booking[]>;
  getById(id: string): Promise<Booking>;
  cancel(id: string): Promise<Booking>;
}

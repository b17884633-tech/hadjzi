import { Booking, CreateBookingPayload } from '../model/Booking';
import { CreateDeskBookingPayload } from '../model/Booking';

export interface BookingRepository {
  create(payload: CreateBookingPayload): Promise<Booking>;
  createDesk(payload: CreateDeskBookingPayload): Promise<Booking>;
  listMine(): Promise<Booking[]>;
  getById(id: string): Promise<Booking>;
  cancel(id: string): Promise<Booking>;
  confirmPayment(id: string): Promise<Booking>;
  complete(id: string): Promise<Booking>;
}

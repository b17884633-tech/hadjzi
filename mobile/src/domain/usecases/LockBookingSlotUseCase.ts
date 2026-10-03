import { Booking, CreateBookingPayload } from '../model/Booking';
import { BookingRepository } from '../repository/BookingRepository';

/** Creates a booking and locks the slot pending deposit payment. */
export class LockBookingSlotUseCase {
  constructor(private readonly bookingRepo: BookingRepository) {}

  execute(payload: CreateBookingPayload): Promise<Booking> {
    return this.bookingRepo.create(payload);
  }
}

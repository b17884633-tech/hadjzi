import { Module } from '@nestjs/common';
import { BookingModule } from '../modules/booking/booking.module';
import { ExpireBookingsJob } from './expire-bookings.job';

@Module({
  imports: [BookingModule],
  providers: [ExpireBookingsJob],
})
export class JobsModule {}

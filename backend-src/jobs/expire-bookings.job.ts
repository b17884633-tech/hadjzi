import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from '../modules/booking/booking.service';

@Injectable()
export class ExpireBookingsJob {
  private readonly logger = new Logger(ExpireBookingsJob.name);

  constructor(private readonly bookings: BookingService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle(): Promise<void> {
    const result = await this.bookings.expirePendingLocks();
    if (result.expired > 0) {
      this.logger.log(`Expired ${result.expired} pending bookings and unlocked inventory`);
    }
  }
}

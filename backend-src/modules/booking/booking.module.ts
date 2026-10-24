import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { ServiceItem } from '../services/entities/service-item.entity';
import { ServiceAvailability } from '../services/entities/service-availability.entity';
import { Payment } from '../payments/entities/payment.entity';
import { ProvidersModule } from '../providers/providers.module';
import { PushModule } from '../push/push.module';
import { AppNotification } from '../admin/entities/notification.entity';
import { Provider } from '../providers/entities/provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      ServiceItem,
      ServiceAvailability,
      Payment,
      AppNotification,
      Provider,
    ]),
    ProvidersModule,
    PushModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}

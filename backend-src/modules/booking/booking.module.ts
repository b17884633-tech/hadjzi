import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { ServiceItem } from '../services/entities/service-item.entity';
import { ServiceAvailability } from '../services/entities/service-availability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, ServiceItem, ServiceAvailability])],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}

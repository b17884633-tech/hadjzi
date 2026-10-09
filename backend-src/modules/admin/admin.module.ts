import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Booking } from '../booking/entities/booking.entity';
import { ServiceItem } from '../services/entities/service-item.entity';
import { Category } from '../categories/entities/category.entity';
import { City } from '../search/entities/city.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { AppNotification } from './entities/notification.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserNotificationsController } from './user-notifications.controller';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    BookingModule,
    TypeOrmModule.forFeature([
      User,
      Provider,
      Payment,
      Dispute,
      Booking,
      ServiceItem,
      Category,
      City,
      PlatformSetting,
      AppNotification,
    ]),
  ],
  controllers: [AdminController, UserNotificationsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

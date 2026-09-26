import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BookingModule } from '../booking/booking.module';
import { StubPaymentGateway } from './gateways/stub.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), BookingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StubPaymentGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}

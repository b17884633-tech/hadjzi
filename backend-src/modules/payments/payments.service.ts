import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Payment } from './entities/payment.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { BookingService } from '../booking/booking.service';
import { StubPaymentGateway } from './gateways/stub.gateway';
import {
  BookingStatus,
  PaymentStatus,
  PaymentType,
} from '../../common/enums';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly bookings: BookingService,
    private readonly gateway: StubPaymentGateway,
    private readonly config: ConfigService,
  ) {}

  depositFor(totalAmount: number, depositPercentage: number) {
    const depositAmount = Math.round(((totalAmount * depositPercentage) / 100) * 100) / 100;
    return {
      depositPercentage,
      depositAmount,
      remainingAmount: Math.round((totalAmount - depositAmount) * 100) / 100,
    };
  }

  async initiate(user: User, dto: InitiatePaymentDto) {
    const booking = await this.bookings.findOneForUser(user, dto.bookingId);
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Booking is not awaiting payment');
    }

    const idempotencyKey = dto.idempotencyKey ?? randomUUID();
    const existing = await this.payments.findOne({ where: { idempotencyKey } });
    if (existing) {
      return existing;
    }

    const initiated = await this.gateway.initiate({
      amount: booking.depositAmount,
      bookingId: booking.id,
      customerId: user.id,
      paymentMethod: dto.paymentMethod,
      idempotencyKey,
    });

    const payment = this.payments.create({
      bookingId: booking.id,
      customerId: user.id,
      amount: booking.depositAmount,
      paymentType: PaymentType.DEPOSIT,
      paymentMethod: dto.paymentMethod,
      gatewayTransactionId: initiated.gatewayTransactionId,
      status: PaymentStatus.INITIATED,
      idempotencyKey,
    });
    const saved = await this.payments.save(payment);
    return { ...saved, redirectUrl: initiated.redirectUrl };
  }

  async handleWebhook(rawBody: Record<string, unknown>, signature?: string) {
    const expected = this.config.get<string>('payment.webhookSecret');
    if (expected && signature !== expected) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = this.gateway.parseWebhook(rawBody);
    const payment = await this.payments.findOne({
      where: { gatewayTransactionId: payload.gatewayTransactionId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    payment.status =
      payload.status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    payment.paidAt = payload.status === 'SUCCESS' ? new Date() : null;
    await this.payments.save(payment);

    if (payment.status === PaymentStatus.SUCCESS && payment.bookingId) {
      await this.bookings.transition(payment.bookingId, BookingStatus.CONFIRMED);
    }
    return payment;
  }
}

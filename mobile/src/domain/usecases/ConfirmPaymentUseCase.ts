import { PaymentSession } from '../model/Payment';
import { PaymentRepository } from '../repository/PaymentRepository';

export class ConfirmPaymentUseCase {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  execute(
    bookingId: string,
    paymentMethod = 'CARD',
    paymentType: 'DEPOSIT' | 'REMAINING' = 'DEPOSIT',
  ): Promise<PaymentSession> {
    return this.paymentRepo.initiate({ bookingId, paymentMethod, paymentType });
  }
}

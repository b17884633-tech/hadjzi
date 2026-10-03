import { PaymentApi } from '../remote/paymentApi';
import { PaymentRepository } from '../../domain/repository/PaymentRepository';
import { InitiatePaymentPayload, PaymentSession } from '../../domain/model/Payment';

type ApiPaymentResponse = {
  id?: string;
  paymentId?: string;
  redirectUrl?: string;
  checkoutUrl?: string;
  amount?: number;
  currency?: string;
};

export class PaymentRepositoryImpl implements PaymentRepository {
  constructor(private readonly api: PaymentApi) {}

  async initiate(payload: InitiatePaymentPayload): Promise<PaymentSession> {
    const { data } = await this.api.initiate(payload);
    const raw = data.data as unknown as ApiPaymentResponse;
    return {
      paymentId: raw.paymentId ?? raw.id ?? '',
      checkoutUrl: raw.checkoutUrl ?? raw.redirectUrl ?? '',
      amount: raw.amount ?? 0,
      currency: raw.currency ?? 'YER',
    };
  }
}

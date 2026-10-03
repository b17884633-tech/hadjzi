import { InitiatePaymentPayload, PaymentSession } from '../model/Payment';

export interface PaymentRepository {
  initiate(payload: InitiatePaymentPayload): Promise<PaymentSession>;
}

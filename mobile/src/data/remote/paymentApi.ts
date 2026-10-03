import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { InitiatePaymentPayload, PaymentSession } from '../../domain/model/Payment';

export class PaymentApi {
  constructor(private readonly client: AxiosInstance) {}

  initiate(payload: InitiatePaymentPayload) {
    return this.client.post<ApiSuccessResponse<PaymentSession>>(
      '/payments/initiate',
      payload,
    );
  }
}

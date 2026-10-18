import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { InitiatePaymentPayload, PaymentSession } from '../../domain/model/Payment';

export type TransferAccount = {
  name: string;
  number: string;
};

export class PaymentApi {
  constructor(private readonly client: AxiosInstance) {}

  transferAccount() {
    return this.client.get<ApiSuccessResponse<TransferAccount>>(
      '/payments/transfer-account',
    );
  }

  initiate(payload: InitiatePaymentPayload) {
    return this.client.post<ApiSuccessResponse<PaymentSession>>(
      '/payments/initiate',
      payload,
    );
  }
}

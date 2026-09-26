import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentGatewayAdapter,
  GatewayWebhookPayload,
} from './payment-gateway.adapter';

@Injectable()
export class StubPaymentGateway implements PaymentGatewayAdapter {
  readonly method = 'STUB';

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return {
      gatewayTransactionId: `${input.paymentMethod}-${randomUUID()}`,
      redirectUrl: `https://payments.local/checkout/${input.bookingId}`,
    };
  }

  parseWebhook(body: Record<string, unknown>): GatewayWebhookPayload {
    return {
      gatewayTransactionId: String(body.gatewayTransactionId ?? ''),
      status: body.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
      amount: Number(body.amount ?? 0),
    };
  }
}

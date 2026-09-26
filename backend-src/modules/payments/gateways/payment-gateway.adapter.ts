export interface InitiatePaymentInput {
  amount: number;
  bookingId: string;
  customerId: string;
  paymentMethod: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  gatewayTransactionId: string;
  redirectUrl?: string;
}

export interface GatewayWebhookPayload {
  gatewayTransactionId: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
}

export interface PaymentGatewayAdapter {
  readonly method: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  parseWebhook(body: Record<string, unknown>): GatewayWebhookPayload;
}

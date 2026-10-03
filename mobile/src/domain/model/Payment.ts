export interface InitiatePaymentPayload {
  bookingId: string;
  paymentMethod: string;
  paymentType?: 'DEPOSIT' | 'REMAINING';
}

export interface PaymentSession {
  paymentId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
}

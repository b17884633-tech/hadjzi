export interface MessagingAdapter {
  readonly channel: 'SMS' | 'WHATSAPP';
  send(phone: string, message: string): Promise<void>;
}

import { Injectable, Logger } from '@nestjs/common';
import { MessagingAdapter } from './messaging.adapter';

@Injectable()
export class ConsoleSmsAdapter implements MessagingAdapter {
  readonly channel = 'SMS' as const;
  private readonly logger = new Logger(ConsoleSmsAdapter.name);

  async send(phone: string, message: string): Promise<void> {
    this.logger.warn(
      `SMS not configured — logging only. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM in .env`,
    );
    this.logger.log(`[SMS -> ${phone}] ${message}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MessagingAdapter } from './messaging.adapter';

@Injectable()
export class ConsoleWhatsappAdapter implements MessagingAdapter {
  readonly channel = 'WHATSAPP' as const;
  private readonly logger = new Logger(ConsoleWhatsappAdapter.name);

  async send(phone: string, message: string): Promise<void> {
    this.logger.warn(
      `WhatsApp not configured — logging only. Set WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta) or TWILIO_* WhatsApp vars in .env`,
    );
    this.logger.log(`[WhatsApp -> ${phone}] ${message}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MessagingAdapter } from './messaging.adapter';

@Injectable()
export class ConsoleWhatsappAdapter implements MessagingAdapter {
  readonly channel = 'WHATSAPP' as const;
  private readonly logger = new Logger(ConsoleWhatsappAdapter.name);

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`[WhatsApp -> ${phone}] ${message}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MessagingAdapter } from './messaging.adapter';

@Injectable()
export class ConsoleSmsAdapter implements MessagingAdapter {
  readonly channel = 'SMS' as const;
  private readonly logger = new Logger(ConsoleSmsAdapter.name);

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`[SMS -> ${phone}] ${message}`);
  }
}

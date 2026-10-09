import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingAdapter } from './messaging.adapter';
import { toE164 } from './phone.util';

@Injectable()
export class TwilioWhatsappAdapter implements MessagingAdapter {
  readonly channel = 'WHATSAPP' as const;
  private readonly logger = new Logger(TwilioWhatsappAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const accountSid = this.config.get<string>('messaging.twilio.accountSid') ?? '';
    const authToken = this.config.get<string>('messaging.twilio.authToken') ?? '';
    let from = this.config.get<string>('messaging.twilio.whatsappFrom') ?? '';
    if (!from.startsWith('whatsapp:')) {
      from = `whatsapp:${toE164(from)}`;
    }
    const to = `whatsapp:${toE164(phone)}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: to, From: from, Body: message });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Twilio WhatsApp failed (${res.status}): ${errText}`);
      throw new ServiceUnavailableException(
        'Failed to send WhatsApp verification code',
      );
    }

    this.logger.log(`WhatsApp sent to ${to}`);
  }
}

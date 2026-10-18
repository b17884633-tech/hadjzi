import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingAdapter } from './messaging.adapter';
import { digitsOnly, toE164 } from './phone.util';

@Injectable()
export class InfobipSmsAdapter implements MessagingAdapter {
  readonly channel = 'SMS' as const;
  private readonly logger = new Logger(InfobipSmsAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>('messaging.infobip.apiKey') ?? '';
    const baseUrl = (
      this.config.get<string>('messaging.infobip.baseUrl') ?? ''
    ).replace(/^https?:\/\//, '').replace(/\/$/, '');
    const from =
      this.config.get<string>('messaging.infobip.smsFrom')?.trim() ||
      'ServiceSMS';
    const to = digitsOnly(toE164(phone));

    if (!apiKey || !baseUrl) {
      throw new ServiceUnavailableException('Infobip SMS is not configured');
    }

    const url = `https://${baseUrl}/sms/2/text/advanced`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            from,
            destinations: [{ to }],
            text: message,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Infobip SMS failed (${res.status}): ${errText}`);
      throw new ServiceUnavailableException('Failed to send SMS verification code');
    }

    this.logger.log(`SMS sent via Infobip to +${to}`);
  }
}

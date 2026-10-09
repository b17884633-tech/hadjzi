import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagingAdapter } from './messaging.adapter';
import { digitsOnly } from './phone.util';

/**
 * Meta WhatsApp Cloud API.
 * - With WHATSAPP_TEMPLATE_NAME: sends an approved template (required for cold OTP).
 * - Without: sends free-form text (only works inside the 24h customer-care window / test).
 */
@Injectable()
export class MetaWhatsappAdapter implements MessagingAdapter {
  readonly channel = 'WHATSAPP' as const;
  private readonly logger = new Logger(MetaWhatsappAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const token = this.config.get<string>('messaging.metaWhatsapp.token') ?? '';
    const phoneNumberId =
      this.config.get<string>('messaging.metaWhatsapp.phoneNumberId') ?? '';
    const templateName =
      this.config.get<string>('messaging.metaWhatsapp.templateName') ?? '';
    const templateLang =
      this.config.get<string>('messaging.metaWhatsapp.templateLang') ?? 'ar';
    const to = digitsOnly(phone);

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const payload = templateName
      ? this.templatePayload(to, templateName, templateLang, message)
      : {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Meta WhatsApp failed (${res.status}): ${errText}`);
      throw new ServiceUnavailableException(
        'Failed to send WhatsApp verification code',
      );
    }

    this.logger.log(`WhatsApp sent to ${to}`);
  }

  /** Extracts the 4–8 digit OTP from the message body for template variables. */
  private templatePayload(
    to: string,
    name: string,
    language: string,
    message: string,
  ) {
    const codeMatch = message.match(/\d{4,8}/);
    const code = codeMatch?.[0] ?? message;

    return {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    };
  }
}

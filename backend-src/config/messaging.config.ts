import { registerAs } from '@nestjs/config';

export default registerAs('messaging', () => ({
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    smsFrom: process.env.TWILIO_SMS_FROM ?? '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
  },
  metaWhatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? '',
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG ?? 'ar',
  },
}));

import { registerAs } from '@nestjs/config';

export default registerAs('messaging', () => ({
  infobip: {
    apiKey: process.env.INFOBIP_API_KEY ?? '',
    baseUrl: process.env.INFOBIP_BASE_URL ?? '',
    smsFrom: process.env.INFOBIP_SMS_FROM ?? 'ServiceSMS',
  },
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

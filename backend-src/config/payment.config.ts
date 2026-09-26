import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  commissionPercentage: Number(process.env.COMMISSION_PERCENTAGE ?? 10),
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? '',
  thawani: {
    secret: process.env.THAWANI_SECRET ?? '',
    publishable: process.env.THAWANI_PUBLISHABLE ?? '',
  },
  kuraimi: {
    secret: process.env.KURAIMI_SECRET ?? '',
  },
  floosak: {
    secret: process.env.FLOOSAK_SECRET ?? '',
  },
}));

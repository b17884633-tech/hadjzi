import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD ?? undefined,
  /** Used by expire-bookings job when Redis worker mode is enabled. */
  enabled: process.env.REDIS_ENABLED === 'true',
}));

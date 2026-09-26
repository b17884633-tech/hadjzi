export const APP_TIMEZONE = process.env.APP_TZ ?? 'Asia/Aden';

export function configureTimezone(): void {
  process.env.TZ = APP_TIMEZONE;
}

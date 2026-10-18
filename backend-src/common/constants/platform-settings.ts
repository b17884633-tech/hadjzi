export const PLATFORM_SETTING_KEYS = {
  DEPOSIT: 'default_deposit_percentage',
  PAYMENT_ACCOUNT_NAME: 'payment_account_name',
  PAYMENT_ACCOUNT_NUMBER: 'payment_account_number',
} as const;

export const DEFAULT_PAYMENT_ACCOUNT = {
  name: 'تطبيق حجزي',
  number: '968146',
} as const;

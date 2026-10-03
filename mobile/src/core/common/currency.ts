import { formatNumber } from './format';

/** Base stored prices in the API are New Yemeni Riyal. */
export type CurrencyCode = 'NEW_YER' | 'OLD_YER' | 'USD' | 'SAR';

export type CurrencyOption = {
  code: CurrencyCode;
  label: string;
  symbol: string;
};

export const CURRENCIES: CurrencyOption[] = [
  { code: 'NEW_YER', label: 'ريال جديد', symbol: 'ر.ي' },
  { code: 'OLD_YER', label: 'ريال قديم', symbol: 'ر.ق' },
  { code: 'USD', label: 'دولار أمريكي', symbol: '$' },
  { code: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'NEW_YER';

/**
 * Demo FX from 1 ريال جديد.
 * Adjust when live market rates are wired.
 */
const FROM_NEW_YER: Record<CurrencyCode, number> = {
  NEW_YER: 1,
  OLD_YER: 2.8,
  USD: 1 / 530,
  SAR: 1 / 141,
};

export function getCurrency(code: CurrencyCode): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function convertFromNewYer(amount: number, code: CurrencyCode): number {
  return amount * FROM_NEW_YER[code];
}

export function formatPriceInCurrency(
  amountInNewYer: number,
  code: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const converted = convertFromNewYer(amountInNewYer, code);
  const { symbol } = getCurrency(code);

  if (code === 'USD' || code === 'SAR') {
    const n = formatNumber(converted, 2);
    return code === 'USD' ? `${symbol}${n}` : `${n} ${symbol}`;
  }

  return `${formatNumber(Math.round(converted))} ${symbol}`;
}

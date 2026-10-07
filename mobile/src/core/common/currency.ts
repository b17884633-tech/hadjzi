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
  return formatAmountInCurrency(convertFromNewYer(amountInNewYer, code), code);
}

/** Format an amount that is already in the target currency (no FX). */
export function formatAmountInCurrency(amount: number, code: CurrencyCode): string {
  const { symbol } = getCurrency(code);

  if (code === 'USD' || code === 'SAR') {
    const n = formatNumber(amount, 2);
    return code === 'USD' ? `${symbol}${n}` : `${n} ${symbol}`;
  }

  return `${formatNumber(Math.round(amount))} ${symbol}`;
}

/** Provider-entered room/service prices per currency. */
export type ServicePrices = Partial<Record<CurrencyCode, number>>;

export function readServicePrices(
  attributes?: Record<string, unknown> | null,
  basePrice?: number | null,
): ServicePrices {
  const prices: ServicePrices = {};
  const raw = attributes?.prices;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const { code } of CURRENCIES) {
      const n = typeof obj[code] === 'number' ? obj[code] : Number(obj[code]);
      if (Number.isFinite(n) && n >= 0) prices[code] = n;
    }
  }
  if (prices.NEW_YER == null && basePrice != null && Number.isFinite(basePrice) && basePrice >= 0) {
    prices.NEW_YER = basePrice;
  }
  return prices;
}

/**
 * Prefer provider-listed price for the selected currency;
 * otherwise convert from New YER.
 */
export function formatServicePrice(
  attributes: Record<string, unknown> | undefined | null,
  basePrice: number | undefined | null,
  code: CurrencyCode,
): string | null {
  const prices = readServicePrices(attributes, basePrice);
  const listed = prices[code];
  if (listed != null) return formatAmountInCurrency(listed, code);
  const yer = prices.NEW_YER ?? basePrice;
  if (yer == null || !Number.isFinite(yer)) return null;
  return formatPriceInCurrency(yer, code);
}

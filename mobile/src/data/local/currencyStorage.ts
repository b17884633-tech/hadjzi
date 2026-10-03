import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  CURRENCIES,
} from '../../core/common/currency';

const CURRENCY_KEY = 'hadjzi.display_currency';

export async function getSelectedCurrency(): Promise<CurrencyCode> {
  const raw = await AsyncStorage.getItem(CURRENCY_KEY);
  if (!raw) return DEFAULT_CURRENCY;
  return CURRENCIES.some((c) => c.code === raw)
    ? (raw as CurrencyCode)
    : DEFAULT_CURRENCY;
}

export async function saveSelectedCurrency(code: CurrencyCode): Promise<void> {
  await AsyncStorage.setItem(CURRENCY_KEY, code);
}

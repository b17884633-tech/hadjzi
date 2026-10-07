import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User } from '../domain/model/User';
import { AppContainer, container } from './container';
import { hasCompletedWelcome as readWelcomeFlag } from '../data/local/onboardingStorage';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  formatPriceInCurrency,
  getCurrency,
} from '../core/common/currency';
import {
  getSelectedCurrency,
  saveSelectedCurrency,
} from '../data/local/currencyStorage';

interface AppContextValue {
  container: AppContainer;
  user: User | null;
  isBootstrapping: boolean;
  hasCompletedWelcome: boolean;
  currency: CurrencyCode;
  currencyLabel: string;
  setUser: (user: User | null) => void;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  formatPrice: (amountInNewYer: number) => string;
  refreshSession: () => Promise<void>;
  markWelcomeComplete: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState(false);
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  const refreshSession = async () => {
    const current = await container.authRepository.getCurrentUser();
    setUser(current);
  };

  useEffect(() => {
    Promise.all([refreshSession(), readWelcomeFlag(), getSelectedCurrency()])
      .then(([, welcomeDone, savedCurrency]) => {
        setHasCompletedWelcome(welcomeDone);
        setCurrencyState(savedCurrency);
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  const markWelcomeComplete = () => setHasCompletedWelcome(true);

  const setCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrencyState(code);
    await saveSelectedCurrency(code);
  }, []);

  const formatPrice = useCallback(
    (amountInNewYer: number) => formatPriceInCurrency(amountInNewYer, currency),
    [currency],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      container,
      user,
      isBootstrapping,
      hasCompletedWelcome,
      currency,
      currencyLabel: getCurrency(currency).label,
      setUser,
      setCurrency,
      formatPrice,
      refreshSession,
      markWelcomeComplete,
    }),
    [
      user,
      isBootstrapping,
      hasCompletedWelcome,
      currency,
      setCurrency,
      formatPrice,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}

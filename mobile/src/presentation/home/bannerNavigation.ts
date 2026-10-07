import { Linking } from 'react-native';
import type { PromoSlide } from './components/HeroPromoBanner';

type Handlers = {
  openCategory: (categoryId: number, title?: string) => void;
  openProvider: (providerId: string) => void;
  /** Resolve SERVICE → provider, then open provider (or no-op if unknown). */
  openService?: (serviceId: string) => void | Promise<void>;
  fallback?: () => void;
};

/**
 * Navigate from a promo banner using API `actionType` / `actionTarget`.
 * Falls back when the slide has no actionable target (e.g. curated defaults).
 */
export function handlePromoSlidePress(slide: PromoSlide, handlers: Handlers) {
  const target = (slide.actionTarget ?? '').trim();
  const type = slide.actionType;

  if (!type || !target) {
    handlers.fallback?.();
    return;
  }

  switch (type) {
    case 'CATEGORY': {
      const categoryId = Number(target);
      if (!Number.isFinite(categoryId)) {
        handlers.fallback?.();
        return;
      }
      handlers.openCategory(categoryId, slide.title);
      return;
    }
    case 'PROVIDER':
      handlers.openProvider(target);
      return;
    case 'SERVICE':
      if (handlers.openService) {
        void handlers.openService(target);
        return;
      }
      handlers.fallback?.();
      return;
    case 'URL':
      Linking.openURL(target).catch(() => undefined);
      return;
    default:
      handlers.fallback?.();
  }
}

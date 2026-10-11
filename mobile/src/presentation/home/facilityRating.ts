import type { Provider } from '../../domain/model/Provider';

/** Real average when the facility has reviews; otherwise undefined (show «جديد»). */
export function facilityRating(provider: Pick<Provider, 'rating' | 'reviewCount'>): number | undefined {
  if (
    provider.reviewCount != null &&
    provider.reviewCount > 0 &&
    provider.rating != null &&
    Number.isFinite(provider.rating) &&
    provider.rating > 0
  ) {
    return provider.rating;
  }
  return undefined;
}

export function facilityRatingLabel(
  provider: Pick<Provider, 'rating' | 'reviewCount'>,
): string {
  const value = facilityRating(provider);
  return value != null ? value.toFixed(1) : 'جديد';
}

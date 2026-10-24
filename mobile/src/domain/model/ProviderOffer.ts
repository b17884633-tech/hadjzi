export type ProviderOffer = {
  id: string;
  providerId: string;
  discountPercent: number;
  startsOn: string;
  endsOn: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ActiveOfferFacility = {
  id: string;
  providerId: string;
  discountPercent: number;
  startsOn: string;
  endsOn: string;
  provider: {
    id: string;
    businessName: string;
    images: string[];
    categoryId?: number | null;
    category?: { id: number; name: string } | null;
    city?: { id: number; name: string } | null;
  } | null;
};

/** Format YYYY-MM-DD for Arabic display (e.g. 17 أغسطس 2026). */
export function formatOfferDateAr(iso: string): string {
  const key = iso.slice(0, 10);
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('ar-EG-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function offerPeriodLabel(startsOn: string, endsOn: string): string {
  return `تخفيض على الحجوزات للأيام بين ${formatOfferDateAr(startsOn)} و ${formatOfferDateAr(endsOn)}`;
}

import { Provider, ServiceItem } from '../../domain/model/Provider';
import { SearchResult } from '../../domain/model/Search';
import { Category } from '../../domain/model/Category';

type ApiService = {
  id: string;
  name: string;
  description?: string | null;
  basePrice?: number | string;
  depositPercentage?: number | string;
  images?: string[];
  attributes?: Record<string, unknown>;
  status?: string;
};

type ApiProvider = {
  id: string;
  businessName: string;
  description?: string | null;
  images?: string[];
  addressDetails?: string | null;
  cancellationPolicy?: string | null;
  attributes?: Record<string, unknown>;
  categoryId?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  city?: { id: number; name: string } | null;
  region?: { id: number; name: string } | null;
  category?: {
    id: number;
    name: string;
    iconUrl?: string;
    bookingType?: 'SLOT' | 'UNIT_DAY' | 'EVENT_DAY' | 'QUANTITY';
  } | null;
  services?: ApiService[];
};

function toNumber(value: number | string | undefined | null): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function mapApiProvider(raw: ApiProvider): Provider {
  const services: ServiceItem[] = (raw.services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    basePrice: toNumber(s.basePrice),
    priceFrom: toNumber(s.basePrice),
    depositPercentage: toNumber(s.depositPercentage) ?? 30,
    images: s.images,
    imageUrl: s.images?.[0],
    attributes: s.attributes ?? {},
    status: s.status,
  }));

  return {
    id: raw.id,
    businessName: raw.businessName,
    description: raw.description,
    images: raw.images ?? [],
    logoUrl: raw.images?.[0],
    addressDetails: raw.addressDetails ?? undefined,
    cancellationPolicy: raw.cancellationPolicy ?? null,
    attributes: raw.attributes ?? {},
    cityName: raw.city?.name,
    regionName: raw.region?.name,
    categoryName: raw.category?.name,
    categoryId: raw.categoryId ?? raw.category?.id ?? null,
    bookingType: raw.category?.bookingType,
    city: raw.city,
    region: raw.region,
    category: raw.category,
    services: services.map((s) => ({
      ...s,
      bookingType: raw.category?.bookingType,
    })),
    verified: true,
    /** Filled from reviews API on the detail page; list cards may stay unset. */
    rating: undefined,
    reviewCount: 0,
    latitude: toNumber(raw.latitude) ?? null,
    longitude: toNumber(raw.longitude) ?? null,
  };
}

export function providerToSearchResult(provider: Provider): SearchResult {
  const priceFrom =
    provider.services
      ?.map((s) => s.priceFrom ?? s.basePrice)
      .filter((n): n is number => n != null)
      .sort((a, b) => a - b)[0] ?? undefined;

  return {
    id: provider.id,
    name: provider.businessName,
    categoryName: provider.categoryName ?? provider.category?.name,
    cityName: provider.cityName ?? provider.city?.name,
    priceFrom,
    imageUrl: provider.images?.[0] ?? provider.logoUrl ?? provider.services?.[0]?.imageUrl,
    description: provider.description,
  };
}

export function mapSearchProviders(rawResults: unknown): {
  results: SearchResult[];
  providers: Provider[];
} {
  const list = Array.isArray(rawResults) ? (rawResults as ApiProvider[]) : [];
  const providers = list.map(mapApiProvider);
  return {
    providers,
    results: providers.map(providerToSearchResult),
  };
}

export function flattenCategories(tree: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      out.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(tree);
  return out;
}

export function rootCategories(tree: Category[]): Category[] {
  return tree.filter((c) => c.parentId == null || c.parentId === undefined);
}

export function findCategoryInTree(
  tree: Category[],
  id: number,
): Category | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findCategoryInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function cheapestService(provider: Provider): ServiceItem | undefined {
  const priced = (provider.services ?? [])
    .filter((s) => (s.priceFrom ?? s.basePrice) != null)
    .sort(
      (a, b) =>
        (a.priceFrom ?? a.basePrice ?? Number.POSITIVE_INFINITY) -
        (b.priceFrom ?? b.basePrice ?? Number.POSITIVE_INFINITY),
    );
  return priced[0] ?? provider.services?.[0];
}

export function featureHintsFromProvider(provider: Provider): string[] {
  const service = cheapestService(provider);
  const attrs = service?.attributes ?? {};
  const hints: string[] = [];

  if (typeof attrs.capacity === 'number') {
    hints.push(`سعة ${attrs.capacity} شخص`);
  }
  if (attrs.pool === true) hints.push('مسبح خاص');
  if (attrs.bbq === true) hints.push('شواء');
  if (attrs.rooms != null) hints.push(`${attrs.rooms} غرف`);
  if (attrs.players != null) hints.push(`حتى ${attrs.players} لاعب`);
  if (Array.isArray(attrs.includes)) {
    const includes = attrs.includes as string[];
    if (includes.includes('lighting')) hints.push('إضاءة متطورة');
    if (includes.includes('sound')) hints.push('صوتيات');
  }
  if (service?.description) {
    const short = service.description.split(/[.،]/)[0]?.trim();
    if (short && short.length < 40 && hints.length < 3) hints.push(short);
  }
  if (!hints.length && provider.description) {
    hints.push(provider.description.slice(0, 48));
  }
  return hints.slice(0, 3);
}

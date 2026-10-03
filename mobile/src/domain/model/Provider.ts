export interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  basePrice?: number;
  priceFrom?: number;
  depositPercentage?: number;
  bookingType?: 'SLOT' | 'UNIT_DAY' | 'EVENT_DAY' | 'QUANTITY';
  images?: string[];
  imageUrl?: string;
  attributes?: Record<string, unknown>;
  status?: string;
}

export interface Provider {
  id: string;
  businessName: string;
  description?: string | null;
  images?: string[];
  logoUrl?: string;
  addressDetails?: string;
  cityName?: string;
  regionName?: string;
  categoryName?: string;
  categoryId?: number | null;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  city?: { id: number; name: string } | null;
  region?: { id: number; name: string } | null;
  category?: {
    id: number;
    name: string;
    iconUrl?: string;
    bookingType?: 'SLOT' | 'UNIT_DAY' | 'EVENT_DAY' | 'QUANTITY';
  } | null;
  bookingType?: 'SLOT' | 'UNIT_DAY' | 'EVENT_DAY' | 'QUANTITY';
  services?: ServiceItem[];
}

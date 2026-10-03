import { SearchLevel } from '../../core/common/types';
import { Provider } from './Provider';

export interface Destination {
  id: number;
  name: string;
  type?: 'region' | 'city';
  regions?: Array<{ id: number; name: string }>;
}

export interface SearchResult {
  id: string;
  name: string;
  categoryName?: string;
  cityName?: string;
  priceFrom?: number;
  imageUrl?: string;
  rating?: number;
  description?: string | null;
}

export interface SearchResponse {
  level: SearchLevel;
  results: SearchResult[];
  /** Raw providers when available from API mapping */
  providers?: Provider[];
}

export interface SearchFilters {
  cityId?: number;
  regionId?: number;
  categoryId?: number;
  date?: string;
  time?: string;
}

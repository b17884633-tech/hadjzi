import { Destination, SearchFilters, SearchResponse } from '../model/Search';

export interface SearchRepository {
  getDestinations(): Promise<Destination[]>;
  search(filters: SearchFilters): Promise<SearchResponse>;
}

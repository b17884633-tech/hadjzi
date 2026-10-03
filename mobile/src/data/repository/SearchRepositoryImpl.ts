import { SearchApi } from '../remote/searchApi';
import { SearchRepository } from '../../domain/repository/SearchRepository';
import { Destination, SearchFilters, SearchResponse } from '../../domain/model/Search';
import { mapSearchProviders } from '../mappers/homeMappers';

export class SearchRepositoryImpl implements SearchRepository {
  constructor(private readonly api: SearchApi) {}

  async getDestinations(): Promise<Destination[]> {
    const { data } = await this.api.destinations();
    return data.data;
  }

  async search(filters: SearchFilters): Promise<SearchResponse> {
    const { data } = await this.api.search(filters);
    const payload = data.data as {
      level: SearchResponse['level'];
      results: unknown;
    };
    const mapped = mapSearchProviders(payload.results);
    return {
      level: payload.level,
      results: mapped.results,
      providers: mapped.providers,
    };
  }
}

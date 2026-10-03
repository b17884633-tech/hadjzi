import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { Destination, SearchFilters, SearchResponse } from '../../domain/model/Search';

export class SearchApi {
  constructor(private readonly client: AxiosInstance) {}

  destinations() {
    return this.client.get<ApiSuccessResponse<Destination[]>>('/destinations');
  }

  search(filters: SearchFilters) {
    return this.client.get<ApiSuccessResponse<SearchResponse>>('/search', {
      params: filters,
    });
  }
}

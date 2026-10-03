import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { Category } from '../../domain/model/Category';

export class CategoryApi {
  constructor(private readonly client: AxiosInstance) {}

  tree() {
    return this.client.get<ApiSuccessResponse<Category[]>>('/categories');
  }
}

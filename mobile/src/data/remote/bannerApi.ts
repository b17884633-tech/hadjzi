import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { Banner } from '../../domain/model/Banner';

export class BannerApi {
  constructor(private readonly client: AxiosInstance) {}

  listActive() {
    return this.client.get<ApiSuccessResponse<Banner[]>>('/banners');
  }
}

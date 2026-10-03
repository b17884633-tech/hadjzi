import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { Provider, ServiceItem } from '../../domain/model/Provider';
import { mapApiProvider } from '../mappers/homeMappers';

export class ProviderApi {
  constructor(private readonly client: AxiosInstance) {}

  async getProfile(id: string) {
    const response = await this.client.get<ApiSuccessResponse<unknown>>(`/providers/${id}`);
    const provider = mapApiProvider(response.data.data as Parameters<typeof mapApiProvider>[0]);
    return { data: { ...response.data, data: provider } };
  }

  /** Services are embedded in the public provider profile response. */
  async listServices(providerId: string) {
    const profile = await this.getProfile(providerId);
    const services: ServiceItem[] = profile.data.data.services ?? [];
    return { data: { ...profile.data, data: services } };
  }
}

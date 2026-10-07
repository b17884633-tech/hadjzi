import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { ServiceItem } from '../../domain/model/Provider';
import { mapApiProvider } from '../mappers/homeMappers';

export type ProviderProfile = {
  id: string;
  businessName: string;
  description?: string | null;
  status?: string;
  categoryId?: number | null;
  cityId?: number | null;
  regionId?: number | null;
  addressDetails?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
  cancellationPolicy?: string | null;
  attributes?: Record<string, unknown>;
  category?: { id: number; name: string } | null;
  city?: { id: number; name: string } | null;
};

export type CreateProviderPayload = {
  businessName: string;
  categoryId?: number;
  description?: string;
  cityId?: number;
  addressDetails?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  cancellationPolicy?: string;
  attributes?: Record<string, unknown>;
};

export class ProviderApi {
  constructor(private readonly client: AxiosInstance) {}

  async getProfile(id: string) {
    const response = await this.client.get<ApiSuccessResponse<unknown>>(`/providers/${id}`);
    const provider = mapApiProvider(response.data.data as Parameters<typeof mapApiProvider>[0]);
    return { data: { ...response.data, data: provider } };
  }

  async listServices(providerId: string) {
    const profile = await this.getProfile(providerId);
    const services: ServiceItem[] = profile.data.data.services ?? [];
    return { data: { ...profile.data, data: services } };
  }

  /** All facilities owned by the current user. */
  async listMine(): Promise<ProviderProfile[]> {
    const response = await this.client.get<ApiSuccessResponse<ProviderProfile[]>>(
      '/providers/me',
    );
    const data = response.data.data;
    return Array.isArray(data) ? data : data ? [data] : [];
  }

  /** @deprecated use listMine — returns first facility if any */
  async getMine(): Promise<ProviderProfile> {
    const list = await this.listMine();
    if (!list.length) {
      const err = new Error('Provider profile not found') as Error & {
        response?: { status: number };
      };
      err.response = { status: 404 };
      throw err;
    }
    return list[0];
  }

  async getMineById(id: string): Promise<ProviderProfile> {
    const response = await this.client.get<ApiSuccessResponse<ProviderProfile>>(
      `/providers/me/${id}`,
    );
    return response.data.data;
  }

  async create(payload: CreateProviderPayload) {
    const response = await this.client.post<ApiSuccessResponse<ProviderProfile>>(
      '/providers',
      payload,
    );
    return response.data.data;
  }

  async updateMine(id: string, payload: Partial<CreateProviderPayload>) {
    const response = await this.client.patch<ApiSuccessResponse<ProviderProfile>>(
      `/providers/me/${id}`,
      payload,
    );
    return response.data.data;
  }

  async setEnabled(id: string, enabled: boolean) {
    const response = await this.client.patch<ApiSuccessResponse<ProviderProfile>>(
      `/providers/me/${id}/enabled`,
      { enabled },
    );
    return response.data.data;
  }
}

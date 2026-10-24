import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { ServiceItem } from '../../domain/model/Provider';
import type {
  ActiveOfferFacility,
  ProviderOffer,
} from '../../domain/model/ProviderOffer';
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
  activeOffer?: ProviderOffer | null;
};

export function facilityDisabledBy(
  provider: Pick<ProviderProfile, 'attributes' | 'status'> | null | undefined,
): 'ADMIN' | 'PROVIDER' | null {
  if (!provider || provider.status !== 'SUSPENDED') return null;
  const v = provider.attributes?.disabledBy;
  return v === 'ADMIN' || v === 'PROVIDER' ? v : 'PROVIDER';
}

export type CreateProviderPayload = {
  businessName: string;
  categoryId?: number;
  description?: string;
  cityId?: number;
  addressDetails?: string;
  latitude?: number | null;
  longitude?: number | null;
  images?: string[];
  cancellationPolicy?: string;
  attributes?: Record<string, unknown>;
};

export type MedicalSpecialty = {
  id: number;
  name: string;
};

/** Always available for hospitals / general practice. */
export const GENERAL_MEDICAL_SPECIALTY = 'عام';

export class ProviderApi {
  constructor(private readonly client: AxiosInstance) {}

  async listMedicalSpecialties(): Promise<MedicalSpecialty[]> {
    const response = await this.client.get<
      ApiSuccessResponse<MedicalSpecialty[]>
    >('/providers/medical-specialties');
    const envelope = response.data as
      | ApiSuccessResponse<MedicalSpecialty[]>
      | MedicalSpecialty[]
      | null
      | undefined;
    const list = Array.isArray(envelope)
      ? envelope
      : Array.isArray(envelope?.data)
        ? envelope.data
        : [];
    const seen = new Set<string>();
    const out: MedicalSpecialty[] = [];
    for (const s of list) {
      if (!s || typeof s.name !== 'string') continue;
      const name = s.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: Number(s.id) || out.length + 1, name });
    }
    if (!seen.has(GENERAL_MEDICAL_SPECIALTY.toLowerCase())) {
      out.unshift({ id: 0, name: GENERAL_MEDICAL_SPECIALTY });
    }
    return out.sort((a, b) => {
      if (a.name === GENERAL_MEDICAL_SPECIALTY) return -1;
      if (b.name === GENERAL_MEDICAL_SPECIALTY) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });
  }

  async ensureMedicalSpecialty(name: string): Promise<MedicalSpecialty | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const response = await this.client.post<
      ApiSuccessResponse<MedicalSpecialty>
    >('/providers/medical-specialties', { name: trimmed });
    const raw = response.data?.data;
    if (!raw?.name) return { id: 0, name: trimmed };
    return { id: Number(raw.id) || 0, name: String(raw.name).trim() };
  }

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

  async setEnabled(id: string, enabled: boolean, reason?: string) {
    const response = await this.client.patch<ApiSuccessResponse<ProviderProfile>>(
      `/providers/me/${id}/enabled`,
      { enabled, ...(reason != null ? { reason } : {}) },
    );
    return response.data.data;
  }

  async listActiveOffers(): Promise<ActiveOfferFacility[]> {
    const response = await this.client.get<
      ApiSuccessResponse<ActiveOfferFacility[]>
    >('/providers/offers/active');
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
  }

  async listOffers(providerId: string): Promise<ProviderOffer[]> {
    const response = await this.client.get<ApiSuccessResponse<ProviderOffer[]>>(
      `/providers/me/${providerId}/offers`,
    );
    const data = response.data?.data;
    return Array.isArray(data) ? data : [];
  }

  async createOffer(
    providerId: string,
    payload: { discountPercent: number; startsOn: string; endsOn: string },
  ): Promise<ProviderOffer> {
    const response = await this.client.post<ApiSuccessResponse<ProviderOffer>>(
      `/providers/me/${providerId}/offers`,
      payload,
    );
    return response.data.data;
  }

  async updateOffer(
    providerId: string,
    offerId: string,
    payload: Partial<{
      discountPercent: number;
      startsOn: string;
      endsOn: string;
    }>,
  ): Promise<ProviderOffer> {
    const response = await this.client.patch<ApiSuccessResponse<ProviderOffer>>(
      `/providers/me/${providerId}/offers/${offerId}`,
      payload,
    );
    return response.data.data;
  }

  async deleteOffer(providerId: string, offerId: string): Promise<void> {
    await this.client.delete(`/providers/me/${providerId}/offers/${offerId}`);
  }
}

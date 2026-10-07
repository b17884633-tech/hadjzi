import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { ServiceAvailability } from '../../presentation/booking/bookingFlow';

type ApiAvailability = {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  availableCapacity?: number | string;
  totalCapacity?: number | string;
  customPrice?: number | string | null;
  status?: string;
};

type ApiServiceDetail = {
  id: string;
  name: string;
  description?: string | null;
  basePrice?: number | string;
  depositPercentage?: number | string;
  durationMinutes?: number | null;
  images?: string[];
  attributes?: Record<string, unknown>;
  status?: string;
  categoryId?: number | null;
  providerId?: string;
  provider?: { id: string } | null;
  category?: { id: number; name: string; bookingType?: string } | null;
  availabilities?: ApiAvailability[];
};

export type OwnedService = {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  depositPercentage: number;
  durationMinutes?: number | null;
  images: string[];
  attributes: Record<string, unknown>;
  status?: string;
  categoryId?: number | null;
  categoryName?: string;
  availabilities: ServiceAvailability[];
};

export type CreateServicePayload = {
  providerId: string;
  name: string;
  basePrice: number;
  description?: string;
  categoryId?: number;
  depositPercentage?: number;
  durationMinutes?: number;
  images?: string[];
  attributes?: Record<string, unknown>;
};

export type UpdateServicePayload = Partial<Omit<CreateServicePayload, 'providerId'>>;

function toNum(v: number | string | null | undefined): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDate(raw: string): string {
  return raw.slice(0, 10);
}

function mapAvailabilities(raw: ApiAvailability[] | undefined): ServiceAvailability[] {
  return (raw ?? []).map((a) => ({
    id: a.id,
    date: normalizeDate(String(a.date)),
    startTime: a.startTime ?? null,
    endTime: a.endTime ?? null,
    availableCapacity: toNum(a.availableCapacity) ?? 0,
    totalCapacity: toNum(a.totalCapacity) ?? 1,
    customPrice: toNum(a.customPrice ?? undefined) ?? null,
    status: a.status,
  }));
}

function mapOwned(raw: ApiServiceDetail): OwnedService {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    basePrice: toNum(raw.basePrice) ?? 0,
    depositPercentage: toNum(raw.depositPercentage) ?? 30,
    durationMinutes: raw.durationMinutes ?? null,
    images: raw.images ?? [],
    attributes: raw.attributes ?? {},
    status: raw.status,
    categoryId: raw.categoryId ?? raw.category?.id ?? null,
    categoryName: raw.category?.name,
    availabilities: mapAvailabilities(raw.availabilities),
  };
}

export class ServiceApi {
  constructor(private readonly client: AxiosInstance) {}

  async getService(id: string) {
    const response = await this.client.get<ApiSuccessResponse<ApiServiceDetail>>(
      `/services/${id}`,
    );
    const raw = response.data.data;
    const availabilities = mapAvailabilities(raw.availabilities).filter(
      (a) => a.availableCapacity > 0 && a.status !== 'BLOCKED',
    );

    return {
      id: raw.id,
      name: raw.name,
      basePrice: toNum(raw.basePrice),
      depositPercentage: toNum(raw.depositPercentage) ?? 30,
      images: raw.images ?? [],
      attributes: raw.attributes ?? {},
      providerId: raw.providerId ?? raw.provider?.id,
      categoryName: raw.category?.name,
      bookingType: raw.category?.bookingType,
      availabilities,
    };
  }

  async listMine(providerId?: string): Promise<OwnedService[]> {
    const response = await this.client.get<ApiSuccessResponse<ApiServiceDetail[]>>(
      '/services/mine',
      { params: providerId ? { providerId } : undefined },
    );
    const list = Array.isArray(response.data.data) ? response.data.data : [];
    return list.map(mapOwned);
  }

  async create(payload: CreateServicePayload): Promise<OwnedService> {
    const response = await this.client.post<ApiSuccessResponse<ApiServiceDetail>>(
      '/services',
      payload,
    );
    return mapOwned(response.data.data);
  }

  async update(id: string, payload: UpdateServicePayload): Promise<OwnedService> {
    const response = await this.client.patch<ApiSuccessResponse<ApiServiceDetail>>(
      `/services/${id}`,
      payload,
    );
    return mapOwned(response.data.data);
  }

  async remove(id: string): Promise<void> {
    await this.client.delete(`/services/${id}`);
  }

  async addAvailability(
    serviceId: string,
    payload: {
      date: string;
      startTime?: string;
      endTime?: string;
      totalCapacity?: number;
      customPrice?: number;
    },
  ) {
    const response = await this.client.post(
      `/services/${serviceId}/availabilities`,
      payload,
    );
    return response.data;
  }

  /** Open all-day bookable dates for hotels / stays (skips existing days). */
  async seedAvailabilities(
    serviceId: string,
    payload: { fromDate?: string; days?: number; totalCapacity?: number } = {},
  ) {
    const response = await this.client.post<{
      data?: { inserted: number; days: number; totalCapacity: number };
    }>(`/services/${serviceId}/availabilities/seed`, payload);
    return response.data?.data ?? { inserted: 0, days: payload.days ?? 90, totalCapacity: payload.totalCapacity ?? 1 };
  }
}

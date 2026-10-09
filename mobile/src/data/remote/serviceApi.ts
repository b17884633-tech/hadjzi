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

/**
 * PG `date` often arrives as midnight local → ISO previous-day UTC
 * (e.g. 2026-10-08 → 2026-10-07T21:00:00.000Z in UTC+3).
 * Noon-shift recovers the calendar day; plain YYYY-MM-DD is kept as-is.
 */
function normalizeDate(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !trimmed.includes('T')) {
      return trimmed.slice(0, 10);
    }
  }
  const d = raw instanceof Date ? raw : new Date(String(raw));
  if (!Number.isNaN(d.getTime())) {
    return new Date(d.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  return String(raw).slice(0, 10);
}

function mapAvailabilities(raw: ApiAvailability[] | undefined): ServiceAvailability[] {
  return (raw ?? []).map((a) => ({
    id: a.id,
    date: normalizeDate(a.date),
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
    const envelope = response.data;
    const raw =
      envelope &&
      typeof envelope === 'object' &&
      'data' in envelope &&
      envelope.data &&
      typeof envelope.data === 'object'
        ? envelope.data
        : (envelope as unknown as ApiServiceDetail);
    if (!raw?.id) {
      throw new Error('تعذر تحميل مواعيد الخدمة');
    }
    const availabilities = mapAvailabilities(raw.availabilities ?? []).filter(
      (a) =>
        a.availableCapacity > 0 &&
        a.status !== 'BLOCKED' &&
        a.status !== 'SOLD_OUT',
    );

    if (__DEV__) {
      console.log(
        '[getService]',
        raw.id,
        'slots=',
        availabilities.length,
        'dates=',
        new Set(availabilities.map((a) => a.date)).size,
      );
    }

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
      status?: 'AVAILABLE' | 'BLOCKED';
    },
  ) {
    const response = await this.client.post(
      `/services/${serviceId}/availabilities`,
      payload,
    );
    return response.data;
  }

  async updateAvailabilityStatus(
    serviceId: string,
    availabilityId: string,
    status: 'AVAILABLE' | 'BLOCKED',
  ) {
    const response = await this.client.patch(
      `/services/${serviceId}/availabilities/${availabilityId}/status`,
      { status },
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

  /** Seed hourly periods for fields / clinics. */
  async seedHourlyAvailabilities(
    serviceId: string,
    payload: {
      fromDate?: string;
      days?: number;
      startHour?: number;
      endHour?: number;
      hours?: number[];
      totalCapacity?: number;
    } = {},
  ) {
    const response = await this.client.post<{
      data?: {
        inserted: number;
        days: number;
        startHour: number;
        endHour: number;
        hours?: number[];
        totalCapacity: number;
      };
    }>(`/services/${serviceId}/availabilities/seed-hourly`, payload);
    return (
      response.data?.data ?? {
        inserted: 0,
        days: payload.days ?? 14,
        startHour: payload.startHour ?? 8,
        endHour: payload.endHour ?? 22,
        hours: payload.hours,
        totalCapacity: payload.totalCapacity ?? 1,
      }
    );
  }
}

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
  basePrice?: number | string;
  depositPercentage?: number | string;
  images?: string[];
  attributes?: Record<string, unknown>;
  category?: { id: number; name: string; bookingType?: string } | null;
  availabilities?: ApiAvailability[];
};

function toNum(v: number | string | null | undefined): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDate(raw: string): string {
  // Postgres date may arrive as ISO datetime
  return raw.slice(0, 10);
}

export class ServiceApi {
  constructor(private readonly client: AxiosInstance) {}

  async getService(id: string) {
    const response = await this.client.get<ApiSuccessResponse<ApiServiceDetail>>(
      `/services/${id}`,
    );
    const raw = response.data.data;
    const availabilities: ServiceAvailability[] = (raw.availabilities ?? [])
      .map((a) => ({
        id: a.id,
        date: normalizeDate(String(a.date)),
        startTime: a.startTime ?? null,
        endTime: a.endTime ?? null,
        availableCapacity: toNum(a.availableCapacity) ?? 0,
        totalCapacity: toNum(a.totalCapacity) ?? 1,
        customPrice: toNum(a.customPrice ?? undefined) ?? null,
        status: a.status,
      }))
      .filter((a) => a.availableCapacity > 0 && a.status !== 'BLOCKED');

    return {
      id: raw.id,
      name: raw.name,
      basePrice: toNum(raw.basePrice),
      depositPercentage: toNum(raw.depositPercentage) ?? 30,
      images: raw.images ?? [],
      attributes: raw.attributes ?? {},
      categoryName: raw.category?.name,
      bookingType: raw.category?.bookingType,
      availabilities,
    };
  }
}

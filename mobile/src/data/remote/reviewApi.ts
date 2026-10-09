import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';

export type FacilityReview = {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string;
  customerId: string | null;
};

export type ReviewSummary = {
  providerId: string;
  count: number;
  average: number;
  reviews: FacilityReview[];
};

export class ReviewApi {
  constructor(private readonly client: AxiosInstance) {}

  async summary(providerId: string): Promise<ReviewSummary> {
    const response = await this.client.get<
      ApiSuccessResponse<{
        providerId: string;
        count: number;
        average: number;
        reviews?: Array<Record<string, unknown>>;
      }>
    >(`/providers/${providerId}/reviews`);
    const data = response.data.data;
    const reviews = (data?.reviews ?? []).map((r) => ({
      id: String(r.id ?? ''),
      bookingId: String(r.bookingId ?? ''),
      rating: Number(r.rating) || 0,
      comment: r.comment != null ? String(r.comment) : null,
      createdAt: r.createdAt ? String(r.createdAt) : '',
      customerName: String(r.customerName ?? 'عميل'),
      customerId: r.customerId != null ? String(r.customerId) : null,
    }));
    return {
      providerId: data?.providerId ?? providerId,
      count: Number(data?.count) || reviews.length,
      average: Number(data?.average) || 0,
      reviews,
    };
  }

  async create(payload: {
    bookingId: string;
    rating: number;
    comment?: string;
  }): Promise<FacilityReview> {
    const response = await this.client.post<
      ApiSuccessResponse<Record<string, unknown>>
    >('/reviews', payload);
    const r = response.data.data ?? {};
    return {
      id: String(r.id ?? ''),
      bookingId: String(r.bookingId ?? payload.bookingId),
      rating: Number(r.rating) || payload.rating,
      comment: r.comment != null ? String(r.comment) : payload.comment ?? null,
      createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
      customerName: 'أنت',
      customerId: r.customerId != null ? String(r.customerId) : null,
    };
  }
}

import { BookingApi } from '../remote/bookingApi';
import { BookingRepository } from '../../domain/repository/BookingRepository';
import { Booking, CreateBookingPayload } from '../../domain/model/Booking';

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapBooking(raw: Record<string, unknown>): Booking {
  const provider = raw.provider as Record<string, unknown> | null | undefined;
  const service = raw.service as Record<string, unknown> | null | undefined;

  return {
    id: String(raw.id),
    bookingNumber: String(raw.bookingNumber ?? ''),
    customerId: (raw.customerId as string | null) ?? null,
    providerId: (raw.providerId as string | null) ?? null,
    serviceId: (raw.serviceId as string | null) ?? null,
    bookingDate: String(raw.bookingDate ?? '').slice(0, 10),
    startTime: (raw.startTime as string | null) ?? null,
    endTime: (raw.endTime as string | null) ?? null,
    quantity: toNum(raw.quantity) || 1,
    totalAmount: toNum(raw.totalAmount),
    depositPercentage: toNum(raw.depositPercentage),
    depositAmount: toNum(raw.depositAmount),
    remainingAmount: toNum(raw.remainingAmount),
    status: raw.status as Booking['status'],
    temporaryLockUntil: (raw.temporaryLockUntil as string | null) ?? null,
    customerNotes: (raw.customerNotes as string | null) ?? null,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    provider: provider
      ? {
          id: String(provider.id),
          businessName: String(provider.businessName ?? 'منشأة'),
          images: (provider.images as string[] | undefined) ?? [],
          addressDetails: (provider.addressDetails as string | null) ?? null,
        }
      : null,
    service: service
      ? {
          id: String(service.id),
          name: String(service.name ?? 'خدمة'),
          images: (service.images as string[] | undefined) ?? [],
          attributes: (service.attributes as Record<string, unknown>) ?? {},
          basePrice: toNum(service.basePrice),
        }
      : null,
  };
}

export class BookingRepositoryImpl implements BookingRepository {
  constructor(private readonly api: BookingApi) {}

  async create(payload: CreateBookingPayload): Promise<Booking> {
    const body = {
      serviceId: payload.serviceId,
      availabilityId: payload.availabilityId,
      quantity: payload.quantity ?? 1,
      customerNotes: payload.customerNotes,
    };
    const { data } = await this.api.create(body);
    return mapBooking(data.data as unknown as Record<string, unknown>);
  }

  async listMine(): Promise<Booking[]> {
    const { data } = await this.api.listMine();
    const list = Array.isArray(data.data) ? data.data : [];
    return list.map((item) => mapBooking(item as unknown as Record<string, unknown>));
  }

  async getById(id: string): Promise<Booking> {
    const { data } = await this.api.getById(id);
    return mapBooking(data.data as unknown as Record<string, unknown>);
  }

  async cancel(id: string): Promise<Booking> {
    const { data } = await this.api.cancel(id);
    return mapBooking(data.data as unknown as Record<string, unknown>);
  }
}

import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { Booking, CreateBookingPayload } from '../../domain/model/Booking';

export class BookingApi {
  constructor(private readonly client: AxiosInstance) {}

  create(payload: CreateBookingPayload) {
    return this.client.post<ApiSuccessResponse<Booking>>('/bookings', payload);
  }

  listMine() {
    return this.client.get<ApiSuccessResponse<Booking[]>>('/bookings');
  }

  getById(id: string) {
    return this.client.get<ApiSuccessResponse<Booking>>(`/bookings/${id}`);
  }

  cancel(id: string) {
    return this.client.patch<ApiSuccessResponse<Booking>>(`/bookings/${id}/cancel`);
  }
}

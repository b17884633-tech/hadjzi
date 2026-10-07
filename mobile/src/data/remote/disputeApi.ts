import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';

export type CreateDisputePayload = {
  reason: string;
  bookingId?: string;
};

export type RemoteDispute = {
  id: string;
  bookingId: string | null;
  reason: string;
  status: string;
  createdAt: string;
};

export class DisputeApi {
  constructor(private readonly client: AxiosInstance) {}

  create(payload: CreateDisputePayload) {
    return this.client.post<ApiSuccessResponse<RemoteDispute>>(
      '/disputes',
      payload,
    );
  }

  listMine() {
    return this.client.get<ApiSuccessResponse<RemoteDispute[]>>('/disputes');
  }
}

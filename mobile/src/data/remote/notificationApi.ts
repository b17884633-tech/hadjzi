import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';

export type RemoteNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  providerId?: string | null;
  providerName?: string | null;
  createdAt: string;
  read: boolean;
};

export class NotificationApi {
  constructor(private readonly client: AxiosInstance) {}

  listMine() {
    return this.client.get<ApiSuccessResponse<RemoteNotification[]>>(
      '/notifications/me',
    );
  }

  markAllRead() {
    return this.client.patch<ApiSuccessResponse<{ ok: boolean }>>(
      '/notifications/me/read',
    );
  }

  markRead(id: string) {
    return this.client.patch<ApiSuccessResponse<{ ok: boolean }>>(
      `/notifications/me/${id}/read`,
    );
  }
}

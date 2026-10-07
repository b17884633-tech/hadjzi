import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';

export type ReviewSummary = {
  providerId: string;
  count: number;
  average: number;
};

export class ReviewApi {
  constructor(private readonly client: AxiosInstance) {}

  async summary(providerId: string): Promise<ReviewSummary> {
    const response = await this.client.get<
      ApiSuccessResponse<{
        providerId: string;
        count: number;
        average: number;
      }>
    >(`/providers/${providerId}/reviews`);
    const data = response.data.data;
    return {
      providerId: data?.providerId ?? providerId,
      count: Number(data?.count) || 0,
      average: Number(data?.average) || 0,
    };
  }
}

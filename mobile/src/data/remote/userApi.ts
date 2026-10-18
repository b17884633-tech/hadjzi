import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { User } from '../../domain/model/User';

export type UpdateProfileRequest = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export class UserApi {
  constructor(private readonly client: AxiosInstance) {}

  updateMe(dto: UpdateProfileRequest) {
    return this.client.patch<ApiSuccessResponse<User>>('/users/me', dto);
  }
}

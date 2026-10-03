import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';
import { AuthTokens, User } from '../../domain/model/User';

export interface LoginRequest {
  phone: string;
  password?: string;
  channel?: 'SMS' | 'WHATSAPP';
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  password?: string;
  email?: string;
  channel?: 'SMS' | 'WHATSAPP';
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
}

export class AuthApi {
  constructor(private readonly client: AxiosInstance) {}

  login(dto: LoginRequest) {
    return this.client.post<
      ApiSuccessResponse<AuthTokens | { requiresOtp: true; otp: unknown }>
    >('/auth/login', dto);
  }

  register(dto: RegisterRequest) {
    return this.client.post<ApiSuccessResponse<{ user: User; otp: unknown }>>(
      '/auth/register',
      dto,
    );
  }

  verifyOtp(dto: VerifyOtpRequest) {
    return this.client.post<ApiSuccessResponse<AuthTokens>>('/auth/otp/verify', dto);
  }

  sendOtp(phone: string, channel: 'SMS' | 'WHATSAPP' = 'SMS') {
    return this.client.post('/auth/otp/send', { phone, channel });
  }
}

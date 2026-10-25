import { AuthApi } from '../remote/authApi';
import {
  AuthRepository,
  LoginResponse,
  PhoneLoginResponse,
} from '../../domain/repository/AuthRepository';
import { AuthTokens, User } from '../../domain/model/User';
import { clearAccessToken, getAccessToken, saveAccessToken } from '../local/tokenStorage';
import {
  clearUserSession,
  getUserSession,
  saveUserSession,
} from '../local/sessionStorage';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(private readonly api: AuthApi) {}

  async login(phone: string, password: string): Promise<LoginResponse> {
    const { data } = await this.api.login({ phone, password });
    const payload = data.data;

    if (payload && typeof payload === 'object' && 'requiresOtp' in payload && payload.requiresOtp) {
      return { kind: 'otp_required', phone };
    }

    const tokens = payload as AuthTokens;
    await this.persistSession(tokens);
    return { kind: 'authenticated', tokens };
  }

  async requestPhoneLogin(
    phone: string,
    channel: 'SMS' | 'WHATSAPP' = 'SMS',
  ): Promise<PhoneLoginResponse> {
    const { data } = await this.api.login({ phone, channel });
    const payload = data.data as {
      requiresRegister?: boolean;
      requiresOtp?: boolean;
      phone?: string;
      accessToken?: string;
      user?: User;
    };

    if (payload?.requiresRegister) {
      return { kind: 'requires_register', phone };
    }
    if (payload?.requiresOtp) {
      return { kind: 'otp_required', phone };
    }
    if (payload?.accessToken && payload.user) {
      const tokens = { accessToken: payload.accessToken, user: payload.user };
      await this.persistSession(tokens);
      return { kind: 'authenticated', tokens };
    }
    return { kind: 'otp_required', phone };
  }

  async register(input: {
    firstName: string;
    lastName: string;
    phone: string;
    password?: string;
    email?: string;
    channel?: 'SMS' | 'WHATSAPP';
  }): Promise<User> {
    const { data } = await this.api.register(input);
    return data.data.user;
  }

  async verifyOtp(phone: string, code: string): Promise<AuthTokens> {
    const { data } = await this.api.verifyOtp({ phone, code });
    await this.persistSession(data.data);
    return data.data;
  }

  async logout(): Promise<void> {
    await clearAccessToken();
    await clearUserSession();
  }

  async getCurrentUser(): Promise<User | null> {
    const [token, session] = await Promise.all([
      getAccessToken(),
      getUserSession(),
    ]);
    // Session without token (e.g. after JWT secret rotation) → treat as logged out
    if (!token || !session) {
      if (token || session) {
        await this.logout();
      }
      return null;
    }
    return session;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await getAccessToken();
    return Boolean(token);
  }

  private async persistSession(tokens: AuthTokens): Promise<void> {
    await saveAccessToken(tokens.accessToken);
    await saveUserSession(tokens.user);
  }
}

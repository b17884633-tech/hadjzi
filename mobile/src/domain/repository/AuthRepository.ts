import { AuthTokens, User } from '../model/User';

export interface LoginResult {
  kind: 'authenticated';
  tokens: AuthTokens;
}

export interface OtpRequiredResult {
  kind: 'otp_required';
  phone: string;
}

export interface RequiresRegisterResult {
  kind: 'requires_register';
  phone: string;
}

export type LoginResponse = LoginResult | OtpRequiredResult;
export type PhoneLoginResponse = LoginResult | OtpRequiredResult | RequiresRegisterResult;

export interface AuthRepository {
  login(phone: string, password: string): Promise<LoginResponse>;
  requestPhoneLogin(
    phone: string,
    channel?: 'SMS' | 'WHATSAPP',
  ): Promise<PhoneLoginResponse>;
  register(input: {
    firstName: string;
    lastName: string;
    phone: string;
    password?: string;
    email?: string;
    channel?: 'SMS' | 'WHATSAPP';
  }): Promise<User>;
  verifyOtp(phone: string, code: string): Promise<AuthTokens>;
  /** Exchange a Firebase Phone Auth ID token for app JWT. */
  loginWithFirebase(input: {
    idToken: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<AuthTokens | RequiresRegisterResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
}

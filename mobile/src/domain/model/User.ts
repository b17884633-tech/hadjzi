import { UserRole } from '../../core/common/types';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  phoneVerified: boolean;
  emailVerified: boolean;
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

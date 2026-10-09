import { clearSession, getToken } from './session';
import type {
  AdminUser,
  Category,
  City,
  Complaint,
  ComplaintStatus,
  Facility,
  FacilityStatus,
  Notice,
  NoticeAudience,
  OverviewResponse,
  Payment,
  PaymentStatus,
  SessionUser,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://hadjzi.onrender.com/api';

type Envelope<T> = {
  success: boolean;
  data: T;
  message?: string | string[];
  statusCode?: number;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Is the backend running on port 3000?');
  }

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || !payload?.success) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      clearSession();
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message || `Request failed (${response.status})`;
    throw new ApiError(response.status, String(message));
  }

  return payload.data;
}

export const api = {
  login(phone: string, password: string) {
    return request<{ accessToken: string; user: SessionUser; requiresOtp?: boolean }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      },
    );
  },

  overview() {
    return request<OverviewResponse>('/admin/overview');
  },

  cities() {
    return request<City[]>('/admin/cities');
  },

  facilities() {
    return request<Facility[]>('/admin/providers');
  },

  updateFacility(id: string, patch: Partial<Facility>) {
    return request<Facility>(`/admin/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        businessName: patch.businessName,
        categoryId: patch.categoryId,
        description: patch.description,
        cityId: patch.cityId,
        addressDetails: patch.address,
      }),
    });
  },

  setFacilityStatus(id: string, status: FacilityStatus) {
    return request<Facility>(`/admin/providers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  users() {
    return request<AdminUser[]>('/admin/users');
  },

  updateUser(id: string, patch: Partial<AdminUser>) {
    return request<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: patch.firstName,
        lastName: patch.lastName,
        phone: patch.phone,
        email: patch.email,
        role: patch.role,
      }),
    });
  },

  setUserStatus(id: string, status: AdminUser['status']) {
    return request<AdminUser>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  complaints() {
    return request<Complaint[]>('/admin/disputes');
  },

  setComplaint(id: string, status: ComplaintStatus, resolution: string) {
    return request<Complaint>(`/admin/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution }),
    });
  },

  payments() {
    return request<Payment[]>('/admin/payments');
  },

  setPaymentStatus(id: string, status: PaymentStatus) {
    return request<Payment>(`/admin/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  refundPayment(id: string) {
    return request<Payment>(`/admin/payments/${id}/refund`, { method: 'POST' });
  },

  categories() {
    return request<Category[]>('/admin/categories');
  },

  createCategory(input: {
    name: string;
    parentId: number | null;
    bookingType: Category['bookingType'];
    sortOrder: number;
  }) {
    return request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        parentId: input.parentId ?? undefined,
        bookingType: input.bookingType,
        sortOrder: input.sortOrder,
        iconUrl: '/icons/category.png',
      }),
    });
  },

  updateCategory(id: number, patch: Partial<Category>) {
    return request<Category>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: patch.name,
        parentId: patch.parentId,
        bookingType: patch.bookingType,
        sortOrder: patch.sortOrder,
        status: patch.status,
        iconUrl: patch.iconUrl,
      }),
    });
  },

  settings() {
    return request<{ depositPercentage: number }>('/admin/settings');
  },

  setDeposit(depositPercentage: number) {
    return request<{ depositPercentage: number }>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ depositPercentage }),
    });
  },

  notices() {
    return request<Notice[]>('/admin/notifications');
  },

  addNotice(input: {
    title: string;
    message: string;
    audience: NoticeAudience;
    userId: string | null;
  }) {
    return request<Notice>('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        message: input.message,
        audience: input.audience,
        userId: input.userId ?? undefined,
      }),
    });
  },
};

import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { notifyUnauthorized } from '../authSession';

export function attachAuthInterceptor(
  client: AxiosInstance,
  getToken: () => Promise<string | null>,
): void {
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const isAuthRoute =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/otp');

      // Stale / rotated JWT — drop local session so UI stops looking "logged in".
      if (status === 401 && !isAuthRoute) {
        notifyUnauthorized();
      }
      return Promise.reject(error);
    },
  );
}

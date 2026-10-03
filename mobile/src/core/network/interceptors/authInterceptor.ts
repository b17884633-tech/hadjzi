import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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
}

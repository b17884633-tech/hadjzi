import { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const IDEMPOTENT_METHODS = new Set(['post', 'patch', 'put']);

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function attachIdempotencyInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase();
    if (method && IDEMPOTENT_METHODS.has(method) && !config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = generateIdempotencyKey();
    }
    return config;
  });
}

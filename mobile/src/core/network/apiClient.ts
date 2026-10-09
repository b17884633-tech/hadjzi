import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { attachAuthInterceptor } from './interceptors/authInterceptor';
import { attachIdempotencyInterceptor } from './interceptors/idempotencyInterceptor';

const API_PORT = 3000;
const DEFAULT_API_BASE = 'https://hadjzi.onrender.com/api';

function metroLanHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as { manifest?: { debuggerHost?: string | null } }).manifest
      ?.debuggerHost ??
    null;

  const host = hostUri?.split(':')?.[0] ?? null;
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function isLocalApiUrl(url: string): boolean {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('10.0.2.2')
  );
}

/**
 * Resolve API base URL.
 * Remote URLs (e.g. Render) always win. Localhost in app.json only
 * triggers LAN/emulator fallbacks in __DEV__.
 */
export function resolveApiBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(
    /\/$/,
    '',
  );

  if (configured && !isLocalApiUrl(configured)) {
    return configured;
  }

  // Dev against a local backend: prefer Metro LAN IP so the phone can reach the PC
  if (__DEV__) {
    const lan = metroLanHost();
    if (lan) {
      return `http://${lan}:${API_PORT}/api`;
    }
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${API_PORT}/api`;
    }
  }

  if (configured) {
    return configured;
  }

  return DEFAULT_API_BASE;
}

const baseURL = resolveApiBaseUrl();

if (__DEV__) {
  console.log('[api] baseURL =', baseURL);
}

export function createApiClient(
  getToken: () => Promise<string | null>,
): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 45_000,
    headers: { 'Content-Type': 'application/json' },
  });

  attachAuthInterceptor(client, getToken);
  attachIdempotencyInterceptor(client);

  return client;
}

import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { attachAuthInterceptor } from './interceptors/authInterceptor';
import { attachIdempotencyInterceptor } from './interceptors/idempotencyInterceptor';

const API_PORT = 3000;

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

/**
 * Resolve API base URL for Expo Go / emulator / simulator.
 * In __DEV__, prefer the Metro LAN IP so a stale app.json IP never breaks the phone.
 */
export function resolveApiBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)?.replace(
    /\/$/,
    '',
  );

  // Dev: always prefer the machine IP Expo is already using (same Wi‑Fi as the phone)
  if (__DEV__) {
    const lan = metroLanHost();
    if (lan) {
      return `http://${lan}:${API_PORT}/api`;
    }
    if (Platform.OS === 'android') {
      // Emulator → host loopback
      return `http://10.0.2.2:${API_PORT}/api`;
    }
  }

  if (configured) {
    return configured;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
}

const baseURL = resolveApiBaseUrl();

if (__DEV__) {
  // Helps debug "Network Error" when the wrong host is used
  console.log('[api] baseURL =', baseURL);
}

export function createApiClient(
  getToken: () => Promise<string | null>,
): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  attachAuthInterceptor(client, getToken);
  attachIdempotencyInterceptor(client);

  return client;
}

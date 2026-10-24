import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { AxiosInstance } from 'axios';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let cachedToken: string | null = null;

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return (
    extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

/**
 * Ask OS permission, create Android channel, return Expo push token.
 * Returns null on simulator / denied / missing project id.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'حجزي',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D1B3E',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') {
    return null;
  }

  const pid = projectId();
  if (!pid) {
    console.warn('[push] Missing EAS projectId — cannot get Expo push token');
    return null;
  }

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    cachedToken = result.data;
    return cachedToken;
  } catch (e) {
    console.warn(
      '[push] getExpoPushTokenAsync failed',
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/** Register this device for the logged-in user (server stores token → userId). */
export async function registerPushToken(client: AxiosInstance): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await client.put('/push/token', {
      token,
      platform: Platform.OS,
    });
  } catch (e) {
    console.warn(
      '[push] register failed',
      e instanceof Error ? e.message : e,
    );
  }
}

/** Unregister on logout so this device stops receiving that user's pushes. */
export async function unregisterPushToken(client: AxiosInstance): Promise<void> {
  try {
    const token = cachedToken ?? (await getExpoPushToken());
    await client.post('/push/token/clear', token ? { token } : {});
    cachedToken = null;
  } catch {
    /* ignore — logout should still succeed */
  }
}

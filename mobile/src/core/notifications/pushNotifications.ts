import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { AxiosInstance } from 'axios';

/**
 * Lazy-load expo-notifications so a missing native module (Expo Go / stale
 * binary) does not crash the whole app at import time.
 */
type NotificationsModule = typeof import('expo-notifications');

let notifications: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (notifications !== undefined) return notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notifications = mod;
    return mod;
  } catch (e) {
    console.warn(
      '[push] expo-notifications native module unavailable — use a development build, not Expo Go',
      e instanceof Error ? e.message : e,
    );
    notifications = null;
    return null;
  }
}

let cachedToken: string | null = null;
let androidChannelReady = false;

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

async function ensureAndroidChannel(
  Notifications: NotificationsModule,
): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'حجزي',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0D1B3E',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
    showBadge: true,
  });
  androidChannelReady = true;
}

/**
 * Ask OS permission, create Android channel, return Expo push token.
 * Returns null on simulator / denied / missing project id / Expo Go.
 *
 * Android closed-app delivery requires google-services.json in the binary
 * and an FCM V1 key uploaded to EAS (eas credentials) — not Firebase Auth.
 */
export async function getExpoPushToken(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidChannel(Notifications);

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') {
    console.warn('[push] notification permission not granted');
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
    if (__DEV__) {
      console.log('[push] Expo token ready', cachedToken?.slice(0, 28));
    }
    return cachedToken;
  } catch (e) {
    console.warn(
      '[push] getExpoPushTokenAsync failed — Android needs google-services.json + EAS FCM V1 credentials',
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * Show a system tray / notification-center entry (works without remote push).
 * Dedupes by identifier so sync + remote push do not double-fire.
 */
export async function presentOsNotification(input: {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await ensureAndroidChannel(Notifications);
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: `hadjzi_${input.id}`,
      content: {
        title: input.title,
        body: input.body,
        sound: true,
        data: input.data ?? { notificationId: input.id },
        ...(Platform.OS === 'android'
          ? { priority: Notifications.AndroidNotificationPriority.HIGH }
          : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.warn(
      '[push] presentOsNotification failed',
      e instanceof Error ? e.message : e,
    );
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

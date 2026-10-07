import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification } from '../../domain/model/Notification';
import { Booking } from '../../domain/model/Booking';
import type { NotificationApi } from '../remote/notificationApi';

const NOTIFICATIONS_KEY = 'hadjzi.notifications';
const BOOKING_STATUS_KEY = 'hadjzi.booking_status_snapshot';

type Listener = () => void;
const listeners = new Set<Listener>();

function emitNotificationsChanged() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

/** Subscribe to local notification list changes (add / mark read). */
export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function uid() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function placeName(booking: Booking): string {
  return (
    booking.provider?.businessName ||
    booking.service?.name ||
    'المنشأة'
  );
}

export async function listNotifications(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as AppNotification[];
    return Array.isArray(list)
      ? list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
  } catch {
    return [];
  }
}

async function saveAll(list: AppNotification[]) {
  const trimmed = list.slice(0, 100);
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
}

export async function addNotification(
  input: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
    id?: string;
    createdAt?: string;
    read?: boolean;
  },
): Promise<AppNotification> {
  const list = await listNotifications();
  // Avoid duplicate for same booking+kind within recent window
  if (input.bookingId) {
    const dup = list.find(
      (n) =>
        n.bookingId === input.bookingId &&
        n.kind === input.kind &&
        Date.now() - new Date(n.createdAt).getTime() < 60_000,
    );
    if (dup) return dup;
  }

  const next: AppNotification = {
    id: input.id ?? uid(),
    title: input.title,
    body: input.body,
    kind: input.kind,
    bookingId: input.bookingId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    read: input.read ?? false,
  };
  await saveAll([next, ...list]);
  emitNotificationsChanged();
  return next;
}

export async function markNotificationRead(id: string): Promise<void> {
  const list = await listNotifications();
  await saveAll(list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  emitNotificationsChanged();
}

export async function markAllNotificationsRead(): Promise<void> {
  const list = await listNotifications();
  await saveAll(list.map((n) => ({ ...n, read: true })));
  emitNotificationsChanged();
}

export async function unreadNotificationCount(): Promise<number> {
  const list = await listNotifications();
  return list.filter((n) => !n.read).length;
}

export async function notifyBookingCreated(booking: Booking): Promise<void> {
  const place = placeName(booking);
  await addNotification({
    kind: 'BOOKING_PENDING',
    bookingId: booking.id,
    title: 'تم استلام حجزك',
    body: `تم استلام حجزك في ${place} وهو بانتظار تأكيد الدفع ✨`,
  });
}

export async function notifyBookingStatus(
  booking: Booking,
  status: Booking['status'],
): Promise<void> {
  const place = placeName(booking);
  switch (status) {
    case 'PENDING_PAYMENT':
      await addNotification({
        kind: 'BOOKING_PENDING',
        bookingId: booking.id,
        title: 'بانتظار تأكيد الدفع',
        body: `حجزك في ${place} بانتظار تأكيد الدفع ✨`,
      });
      break;
    case 'CONFIRMED':
      await addNotification({
        kind: 'BOOKING_CONFIRMED',
        bookingId: booking.id,
        title: 'تم تأكيد الحجز',
        body: `تم تأكيد حجزك في ${place} بنجاح ✨`,
      });
      break;
    case 'CANCELLED':
      await addNotification({
        kind: 'BOOKING_CANCELLED',
        bookingId: booking.id,
        title: 'تم إلغاء الحجز',
        body: `تم إلغاء حجزك في ${place}.`,
      });
      break;
    case 'COMPLETED':
      await addNotification({
        kind: 'BOOKING_COMPLETED',
        bookingId: booking.id,
        title: 'اكتمل الحجز',
        body: `اكتمل حجزك في ${place}. نتمنى لك تجربة رائعة ✨`,
      });
      break;
    case 'EXPIRED':
      await addNotification({
        kind: 'BOOKING_EXPIRED',
        bookingId: booking.id,
        title: 'انتهى الحجز',
        body: `انتهت صلاحية حجزك في ${place}.`,
      });
      break;
    default:
      break;
  }
}

function mapRemoteKind(kind: string): AppNotification['kind'] {
  switch (kind) {
    case 'FACILITY_STATUS':
      return 'FACILITY_STATUS';
    case 'BOOKING_CREATED':
    case 'BOOKING_PENDING':
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_COMPLETED':
    case 'BOOKING_EXPIRED':
      return kind;
    default:
      return 'GENERAL';
  }
}

let remoteSyncInFlight: Promise<void> | null = null;
let lastRemoteSyncAt = 0;
/** Minimum gap between network polls (badge / focus sync). */
const REMOTE_SYNC_MIN_INTERVAL_MS = 60_000;

function notificationsFingerprint(list: AppNotification[]): string {
  return list
    .map((n) => `${n.id}:${n.read ? 1 : 0}:${n.createdAt}:${n.title}`)
    .join('|');
}

/**
 * Pull admin/server notifications into local storage.
 * Dedupes concurrent calls and throttles network polls (pass force to bypass).
 */
export async function syncRemoteNotifications(
  api: NotificationApi,
  options?: { force?: boolean },
): Promise<void> {
  const force = options?.force === true;
  const now = Date.now();

  // Always coalesce concurrent callers onto one in-flight request.
  if (remoteSyncInFlight) return remoteSyncInFlight;

  if (
    !force &&
    lastRemoteSyncAt > 0 &&
    now - lastRemoteSyncAt < REMOTE_SYNC_MIN_INTERVAL_MS
  ) {
    return Promise.resolve();
  }

  // Stamp immediately so overlapping focus effects cannot stampede the API.
  lastRemoteSyncAt = now;

  remoteSyncInFlight = (async () => {
    try {
      const remote = await api.listMine();
      const rows = remote.data.data ?? [];
      if (!rows.length) return;

      const local = await listNotifications();
      const before = notificationsFingerprint(local);
      const byId = new Map(local.map((item) => [item.id, item]));

      for (const item of rows) {
        const existing = byId.get(item.id);
        byId.set(item.id, {
          id: item.id,
          title: item.title,
          body: item.body,
          kind: mapRemoteKind(item.kind),
          providerId: item.providerId ?? undefined,
          createdAt:
            typeof item.createdAt === 'string'
              ? item.createdAt
              : new Date(item.createdAt).toISOString(),
          read: existing?.read || item.read,
        });
      }

      const merged = [...byId.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      if (notificationsFingerprint(merged) === before) return;

      await saveAll(merged);
      emitNotificationsChanged();
    } catch {
      // Allow a quicker retry after a failed poll.
      lastRemoteSyncAt = 0;
    } finally {
      remoteSyncInFlight = null;
    }
  })();

  return remoteSyncInFlight;
}

/** Compare current bookings to last snapshot and emit notifications for changes. */
export async function syncBookingNotifications(
  bookings: Booking[],
): Promise<void> {
  const raw = await AsyncStorage.getItem(BOOKING_STATUS_KEY);
  let prev: Record<string, string> = {};
  try {
    prev = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    prev = {};
  }

  const next: Record<string, string> = { ...prev };

  for (const b of bookings) {
    const before = prev[b.id];
    if (!before) {
      // First time seeing this booking — notify created/pending once
      if (b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED') {
        await notifyBookingStatus(b, b.status);
      }
    } else if (before !== b.status) {
      await notifyBookingStatus(b, b.status);
    }
    next[b.id] = b.status;
  }

  await AsyncStorage.setItem(BOOKING_STATUS_KEY, JSON.stringify(next));
}

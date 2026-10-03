import { Ionicons } from '@expo/vector-icons';
import { BookingStatus } from '../../core/common/types';
import { Booking } from '../../domain/model/Booking';
import { theme } from '../../core/ui/theme';
import { formatArabicDate } from '../booking/bookingFlow';

export type BookingFilter =
  | 'ALL'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export const BOOKING_FILTERS: { key: BookingFilter; label: string }[] = [
  { key: 'ALL', label: 'الكل' },
  { key: 'CONFIRMED', label: 'في انتظار التأكيد' },
  { key: 'PENDING_PAYMENT', label: 'في انتظار الدفع' },
  { key: 'COMPLETED', label: 'مكتمل' },
  { key: 'CANCELLED', label: 'ملغي' },
];

export function statusLabel(status: BookingStatus | string): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'في انتظار تأكيد الدفع';
    case 'CONFIRMED':
      return 'مؤكد';
    case 'CANCELLED':
      return 'ملغي';
    case 'COMPLETED':
      return 'مكتمل';
    case 'EXPIRED':
      return 'منتهي';
    case 'REFUNDED':
      return 'مسترد';
    default:
      return status;
  }
}

export function statusIcon(status: BookingStatus | string): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'wallet-outline';
    case 'CONFIRMED':
      return 'checkmark-circle-outline';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'close-circle-outline';
    case 'COMPLETED':
      return 'ribbon-outline';
    default:
      return 'time-outline';
  }
}

export function statusColors(status: BookingStatus | string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { bg: '#F8F1E4', text: theme.colors.accentDark };
    case 'CONFIRMED':
      return { bg: '#E8EEF8', text: theme.colors.primary };
    case 'CANCELLED':
    case 'EXPIRED':
      return { bg: '#FDECEC', text: theme.colors.error };
    case 'COMPLETED':
      return { bg: '#EAF7F0', text: '#0F766E' };
    default:
      return { bg: theme.colors.tealLight, text: theme.colors.primary };
  }
}

export function formatBookingDate(raw?: string | null): string {
  if (!raw) return '—';
  const iso = String(raw).slice(0, 10);
  try {
    return formatArabicDate(iso);
  } catch {
    return iso;
  }
}

export function bookingTitle(booking: Booking): string {
  return booking.provider?.businessName || booking.service?.name || 'حجز حجزي';
}

export function bookingImage(booking: Booking): string | undefined {
  return booking.provider?.images?.[0] || booking.service?.images?.[0] || undefined;
}

export function capacityFromBooking(booking: Booking): string | undefined {
  const attrs = booking.service?.attributes ?? {};
  const cap =
    (typeof attrs.capacity === 'number' && attrs.capacity) ||
    (typeof attrs.guests === 'number' && attrs.guests) ||
    null;
  if (cap != null) return `${cap} أو أقل`;
  if (booking.quantity > 1) return `الكمية: ${booking.quantity}`;
  return undefined;
}

function formatArabicClock(raw: string): string {
  const [hStr, mStr] = String(raw).slice(0, 5).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h)) return String(raw).slice(0, 5);
  const period = h < 12 ? 'صباحاً' : 'مساءً';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mins = Number.isFinite(m) && m > 0 ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour12}${mins} ${period}`;
}

export function timeRangeLabel(booking: Booking): string | undefined {
  if (!booking.startTime) return undefined;
  const start = formatArabicClock(booking.startTime);
  if (!booking.endTime) return `الوقت ${start}`;
  return `من ${start} إلى ${formatArabicClock(booking.endTime)}`;
}

export function insuranceEstimate(total: number): number {
  return Math.round(total * 0.227);
}

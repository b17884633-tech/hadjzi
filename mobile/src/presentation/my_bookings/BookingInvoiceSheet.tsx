import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Booking } from '../../domain/model/Booking';
import { User } from '../../domain/model/User';
import {
  bookingTitle,
  formatBookingDate,
  statusLabel,
} from './bookingUi';

type Props = {
  visible: boolean;
  booking: Booking;
  user: User | null;
  onClose: () => void;
};

function formatSlashDate(raw?: string | null): string {
  if (!raw) return '—';
  const iso = String(raw).slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}/${Number(m)}/${Number(d)}`;
}

function formatWeekdayBookingDate(raw?: string | null): string {
  if (!raw) return '—';
  const iso = String(raw).slice(0, 10);
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return formatSlashDate(iso);
  const weekday = date.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long' });
  return `يوم ${weekday} الموافق ${formatSlashDate(iso)}`;
}

function guestCountLabel(booking: Booking): string {
  const attrs = booking.service?.attributes ?? {};
  const guests =
    (typeof attrs.guests === 'number' && attrs.guests) ||
    (typeof attrs.capacity === 'number' && attrs.capacity) ||
    booking.quantity;
  return `${guests} شخص`;
}

function personTypeLabel(booking: Booking): string {
  const attrs = booking.service?.attributes ?? {};
  const type = attrs.personType ?? attrs.attendanceType ?? attrs.guestType;
  if (typeof type === 'string' && type.trim()) return type;
  return '—';
}

export function BookingInvoiceSheet({ visible, booking, user, onClose }: Props) {
  const { formatPrice } = useApp();
  const insets = useSafeAreaInsets();

  const customerName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : '—';
  const phone = user?.phone?.replace(/^\+?967/, '') || user?.phone || '—';
  const title = bookingTitle(booking);
  const status = statusLabel(booking.status);
  const paid =
    booking.status === 'PENDING_PAYMENT'
      ? booking.depositAmount
      : booking.totalAmount - booking.remainingAmount || booking.depositAmount;
  const remaining =
    booking.status === 'PENDING_PAYMENT'
      ? booking.remainingAmount
      : Math.max(0, booking.remainingAmount);

  const invoiceText = [
    'فاتورة الحجز — حجزي',
    `الاسم: ${customerName}`,
    `رقم التواصل: ${phone}`,
    `اسم المنشأة: ${title}`,
    `حالة الحجز: ${status}`,
    `تاريخ الحجز: ${formatWeekdayBookingDate(booking.bookingDate)}`,
    `نوع الأشخاص: ${personTypeLabel(booking)}`,
    `عددهم: ${guestCountLabel(booking)}`,
    `الباقة المحجوزة: ${booking.service?.name ?? '—'}`,
    `تاريخ إنشاء الحجز: ${formatSlashDate(booking.createdAt ?? booking.bookingDate)}`,
    `رقم الحجز: ${booking.bookingNumber}`,
    `إجمالي قيمة الحجز: ${formatPrice(booking.totalAmount)}`,
    `المدفوع: ${formatPrice(paid)}`,
    `المبلغ المتبقي: ${formatPrice(remaining)}`,
  ].join('\n');

  const shareInvoice = async () => {
    try {
      await Share.share({ message: invoiceText });
    } catch {
      /* cancelled */
    }
  };

  return (
    <SmoothBottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="receipt-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>فاتورة الحجز</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn} onPress={shareInvoice}>
            <Ionicons name="paper-plane-outline" size={18} color={theme.colors.primary} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={shareInvoice}>
            <Ionicons name="print-outline" size={18} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.sectionTitle}>معلومات العميل</Text>
        <View style={styles.card}>
          <InvoiceRow label="الاسم" value={customerName} />
          <InvoiceRow label="رقم التواصل" value={phone} />
        </View>

        <Text style={styles.sectionTitle}>معلومات الحجز</Text>
        <View style={styles.card}>
          <InvoiceRow label="اسم الشاليه" value={title} />
          <InvoiceRow label="حالة حجز" value={status} valueColor={theme.colors.accent} />
          <InvoiceRow
            label="تاريخ الحجز"
            value={formatWeekdayBookingDate(booking.bookingDate)}
          />
          <InvoiceRow label="نوع الاشخاص" value={personTypeLabel(booking)} />
          <InvoiceRow label="عددهم" value={guestCountLabel(booking)} />
          <InvoiceRow
            label="الباقة المحجوزه"
            value={booking.service?.name ?? '—'}
          />
          <InvoiceRow
            label="تاريخ انشاء الحجز"
            value={formatSlashDate(booking.createdAt ?? booking.bookingDate)}
          />
          <InvoiceRow label="رقم الحجز" value={booking.bookingNumber} />
        </View>

        <Text style={styles.sectionTitle}>معلومات الدفع</Text>
        <View style={styles.card}>
          <InvoiceRow
            label="اجمالي قيمه الحجز"
            value={formatPrice(booking.totalAmount)}
          />
          <InvoiceRow label="المدفوع" value={formatPrice(paid)} />
          <InvoiceRow label="المبلغ المتبقي" value={formatPrice(remaining)} />
        </View>

        <Text style={styles.footnote}>
          تاريخ الإصدار: {formatBookingDate(new Date().toISOString().slice(0, 10))}
        </Text>
      </ScrollView>
    </SmoothBottomSheet>
  );
}

function InvoiceRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '92%',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    gap: 10,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'left',
  },
  footnote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});

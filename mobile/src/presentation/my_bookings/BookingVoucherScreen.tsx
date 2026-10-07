import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../core/ui/components/BackButton';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Booking } from '../../domain/model/Booking';
import { RootStackParamList } from '../navigation/types';
import { BookingInvoiceSheet } from './BookingInvoiceSheet';
import { notifyBookingStatus } from '../../data/local/notificationStorage';
import {
  bookingImage,
  bookingTitle,
  capacityFromBooking,
  formatBookingDate,
  guestDisplayInfo,
  parseBookingNoteLines,
  statusColors,
  statusIcon,
  statusLabel,
  timeRangeLabel,
} from './bookingUi';

type Route = RouteProp<RootStackParamList, 'BookingVoucher'>;

export function BookingVoucherScreen() {
  const { bookingId, mode } = useRoute<Route>().params;
  const isProviderView = mode === 'provider';
  const { container, formatPrice, user } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const reload = () => {
    setLoading(true);
    container.bookingRepository
      .getById(bookingId)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, bookingId]);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>تفاصيل الحجز</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.empty}>تعذر تحميل تفاصيل الحجز</Text>
      </SafeAreaView>
    );
  }

  const colors = statusColors(booking.status);
  const image = bookingImage(booking);
  const title = isProviderView
    ? booking.service?.name ?? bookingTitle(booking)
    : bookingTitle(booking);
  const capacity = capacityFromBooking(booking);
  const timeLabel = timeRangeLabel(booking);
  const orderDate = formatBookingDate(booking.createdAt?.slice(0, 10) ?? booking.bookingDate);
  const stayDate = formatBookingDate(booking.bookingDate);
  const guest = guestDisplayInfo(booking);
  const noteLines = parseBookingNoteLines(booking.customerNotes);

  const openProvider = () => {
    if (booking.providerId) {
      navigation.navigate('ProviderProfile', { providerId: booking.providerId });
    }
  };

  const onComplete = async () => {
    setActing(true);
    try {
      const updated = await container.bookingRepository.complete(booking.id);
      setBooking(updated);
      await notifyBookingStatus(updated, updated.status).catch(() => undefined);
    } catch (e) {
      Alert.alert(
        'تعذر الإكمال',
        e instanceof Error ? e.message : 'يمكن إكمال الحجوزات المؤكدة فقط',
      );
    } finally {
      setActing(false);
    }
  };

  const onCancel = () => {
    Alert.alert('إلغاء الحجز', `إلغاء الحجز ${booking.bookingNumber}؟`, [
      { text: 'تراجع', style: 'cancel' },
      {
        text: 'إلغاء الحجز',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            const updated = await container.bookingRepository.cancel(booking.id);
            setBooking(updated);
            await notifyBookingStatus(updated, updated.status).catch(
              () => undefined,
            );
          } catch (e) {
            Alert.alert(
              'تعذر الإلغاء',
              e instanceof Error ? e.message : 'حاول مرة أخرى',
            );
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>تفاصيل الحجز</Text>
        <Pressable style={styles.printBtn} onPress={() => setInvoiceOpen(true)}>
          <Ionicons name="print-outline" size={18} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.summaryCard}
          onPress={isProviderView ? undefined : openProvider}
          disabled={isProviderView}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.summaryImg} />
          ) : (
            <View style={[styles.summaryImg, styles.imgFallback]}>
              <Ionicons name="image-outline" size={20} color="#fff" />
            </View>
          )}
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.summaryId}>#{booking.bookingNumber}</Text>
          </View>
          {!isProviderView ? (
            <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
          ) : null}
        </Pressable>

        <Text style={styles.sectionLabel}>تفاصيل الحجز</Text>
        <View style={styles.card}>
          <DetailRow
            icon="cube-outline"
            label="حالة الطلب"
            right={
              <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                <Ionicons name={statusIcon(booking.status)} size={13} color={colors.text} />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {statusLabel(booking.status)}
                </Text>
              </View>
            }
          />
          <View style={styles.divider} />
          <DetailRow icon="calendar-outline" label="تاريخ الطلب" value={orderDate} />
          <View style={styles.divider} />
          <DetailRow icon="calendar-outline" label="تاريخ الحجز" value={stayDate} />
          {booking.quantity > 1 ? (
            <>
              <View style={styles.divider} />
              <DetailRow
                icon="bed-outline"
                label="الكمية / الغرف"
                value={String(booking.quantity)}
              />
            </>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>العميل</Text>
        <View style={styles.card}>
          <DetailRow icon="person-outline" label="الاسم" value={guest.name} />
          {guest.phone ? (
            <>
              <View style={styles.divider} />
              <DetailRow icon="call-outline" label="الهاتف" value={guest.phone} />
            </>
          ) : null}
          {guest.isDesk ? (
            <>
              <View style={styles.divider} />
              <DetailRow
                icon="storefront-outline"
                label="نوع الحجز"
                value="حجز مكتبي (بدون دفع إلكتروني)"
              />
            </>
          ) : null}
        </View>

        {noteLines.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>تفاصيل إضافية</Text>
            <View style={styles.card}>
              {noteLines.map((line, i) => (
                <View key={`${line.label}-${i}`}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <DetailRow
                    icon={line.icon}
                    label={line.label}
                    value={line.value}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>الباقة المحجوزة</Text>
        <View style={styles.card}>
          <Text style={styles.price}>{formatPrice(booking.totalAmount)}</Text>
          <Text style={styles.packageName}>{booking.service?.name ?? 'باقة الحجز'}</Text>
          <View style={styles.divider} />
          <IconLine icon="calendar-outline" text={`تاريخ الحجز: ${stayDate}`} />
          {capacity ? (
            <IconLine icon="people-outline" text={`عدد الأشخاص: ${capacity}`} />
          ) : null}
          {timeLabel ? <IconLine icon="time-outline" text={timeLabel} /> : null}
        </View>

        <Text style={styles.sectionLabel}>الدفع</Text>
        <View style={styles.card}>
          {booking.status === 'PENDING_PAYMENT' ? (
            <>
              <MoneyRow
                label={`العربون (${booking.depositPercentage}%)`}
                value={formatPrice(booking.depositAmount)}
              />
              <View style={styles.divider} />
              <MoneyRow label="المتبقي" value={formatPrice(booking.remainingAmount)} />
              <View style={styles.divider} />
            </>
          ) : (
            <>
              <MoneyRow
                label={guest.isDesk ? 'مدفوع في المنشأة' : 'دفع كامل'}
                value={formatPrice(booking.totalAmount)}
              />
              <View style={styles.divider} />
            </>
          )}
          <MoneyRow label="الإجمالي" value={formatPrice(booking.totalAmount)} bold />
        </View>
      </ScrollView>

      {isProviderView ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.providerActions}>
            {booking.status === 'CONFIRMED' ? (
              <Pressable
                style={[styles.actionBtn, styles.actionPrimary]}
                disabled={acting}
                onPress={onComplete}
              >
                {acting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionPrimaryText}>إكمال الحجز</Text>
                )}
              </Pressable>
            ) : null}
            {booking.status === 'CONFIRMED' ||
            booking.status === 'PENDING_PAYMENT' ? (
              <Pressable
                style={[styles.actionBtn, styles.actionDanger]}
                disabled={acting}
                onPress={onCancel}
              >
                <Text style={styles.actionDangerText}>إلغاء</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : booking.providerId ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable style={styles.providerBtn} onPress={openProvider}>
            <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.providerBtnText}>استعراض تفاصيل المنشأة</Text>
          </Pressable>
        </View>
      ) : null}

      <BookingInvoiceSheet
        visible={invoiceOpen}
        booking={booking}
        user={user}
        onClose={() => setInvoiceOpen(false)}
      />
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      </View>
      {right ?? (
        <Text style={styles.detailValue} numberOfLines={3}>
          {value}
        </Text>
      )}
    </View>
  );
}

function IconLine({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.iconLine}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      <Text style={styles.iconLineText}>{text}</Text>
    </View>
  );
}

function MoneyRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, bold && styles.moneyBold]}>{label}</Text>
      <Text style={[styles.moneyValue, bold && styles.moneyBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerSpacer: { width: 40 },
  printBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scroll: { paddingHorizontal: 16, gap: 10 },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.textSecondary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
  },
  summaryImg: { width: 56, height: 56, borderRadius: 12 },
  imgFallback: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { flex: 1, alignItems: 'flex-start', gap: 4 },
  summaryTitle: {
    width: '100%',
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  summaryId: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  sectionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.accent,
    textAlign: 'right',
  },
  packageName: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconLineText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moneyLabel: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  moneyValue: { fontSize: 13, color: theme.colors.accent, fontWeight: '700' },
  moneyBold: { fontWeight: '800', fontSize: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  providerBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.tealLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  providerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  providerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  actionDanger: {
    backgroundColor: '#FDECEC',
  },
  actionDangerText: {
    color: theme.colors.error,
    fontWeight: '800',
    fontSize: 14,
  },
});

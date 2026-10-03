import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../core/ui/components/BackButton';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';
import { DEPOSIT_PERCENTAGE } from '../../core/common/bookingConstants';
import { CurrencyCode } from '../../core/common/currency';
import { formatArabicDate } from './bookingFlow';
import { PaymentTransferSheet } from './components/PaymentTransferSheet';
import { CurrencyPickerSheet } from '../account/CurrencyPickerSheet';

type Route = RouteProp<RootStackParamList, 'BookingCheckout'>;

type PayMethod = 'TRANSFER' | 'JEEB';

export function BookingCheckoutScreen() {
  const params = useRoute<Route>().params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { container, formatPrice, currency, setCurrency, currencyLabel } = useApp();
  const insets = useSafeAreaInsets();

  const [payMethod, setPayMethod] = useState<PayMethod>('JEEB');
  const [coupon, setCoupon] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = params.price * params.quantity;
  const depositPct = DEPOSIT_PERCENTAGE;
  const depositAmount = Math.round((total * depositPct) / 100);

  const guestLine = useMemo(() => {
    const adults = params.adults ?? 0;
    const children = params.children ?? 0;
    const totalPeople = adults + children;
    if (!totalPeople) return null;
    return `${totalPeople} أشخاص${children ? ` (${children} أطفال)` : ''}`;
  }, [params.adults, params.children]);

  const createBooking = async (transferRef: string) => {
    return container.lockBookingSlotUseCase.execute({
      serviceId: params.serviceId,
      availabilityId: params.availabilityId,
      quantity: params.quantity,
      bookingDate: params.bookingDate,
      startTime: params.startTime ?? undefined,
      endTime: params.endTime ?? undefined,
      customerNotes: [
        params.attendanceType ? `نوع الحضور: ${params.attendanceType}` : null,
        guestLine ? `عدد الأشخاص: ${guestLine}` : null,
        params.checkOutDate ? `المغادرة: ${params.checkOutDate}` : null,
        params.nights ? `الليالي: ${params.nights}` : null,
        params.rooms ? `الغرف: ${params.rooms}` : null,
        params.periodLabel ? `الفترة: ${params.periodLabel}` : null,
        params.durationHours
          ? `المدة: ${params.durationHours === 4 ? 'نصف يوم' : `${params.durationHours} ساعة`}`
          : null,
        params.deliveryTime ? `وقت التسليم: ${params.deliveryTime}` : null,
        params.pickupPoint ? `الانطلاق: ${params.pickupPoint}` : null,
        params.dropoffPoint ? `الوصول: ${params.dropoffPoint}` : null,
        `طريقة الدفع: ${payMethod}`,
        `رقم الحوالة: ${transferRef}`,
      ]
        .filter(Boolean)
        .join(' | '),
    });
  };

  const onContinue = () => {
    setError(null);
    setTransferOpen(true);
  };

  const onConfirmTransfer = async (transferRef: string) => {
    setLoading(true);
    setError(null);
    try {
      // Creates booking as PENDING_PAYMENT — shows under حجوزاتي as pending
      await createBooking(transferRef);
      setTransferOpen(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'MyBookings' } }],
      });
    } catch (e: unknown) {
      setTransferOpen(false);
      const axiosMsg =
        typeof e === 'object' &&
        e &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: unknown } } }).response?.data
          ?.message !== 'undefined'
          ? (e as { response: { data: { message: string | string[] } } }).response.data
              .message
          : null;
      const message = Array.isArray(axiosMsg)
        ? axiosMsg.join('، ')
        : typeof axiosMsg === 'string'
          ? axiosMsg
          : e instanceof Error
            ? e.message
            : 'تعذر إنشاء الحجز. تأكد من تسجيل الدخول وتوفر الموعد.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>دفع المبلغ كامل</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heroTitle}>قم بدفع لتأكيد الحجز</Text>
        <Text style={styles.heroSub}>قم بدفع المبلغ كاملاً لتأكيد الحجز</Text>

        <View style={styles.serviceCard}>
          {params.image ? (
            <Image source={{ uri: params.image }} style={styles.serviceImg} />
          ) : (
            <View style={[styles.serviceImg, styles.imgFallback]}>
              <Ionicons name="image-outline" size={22} color="#fff" />
            </View>
          )}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName} numberOfLines={2}>
              {params.providerName}
            </Text>
            <View style={styles.catRow}>
              <Ionicons name="business-outline" size={14} color={theme.colors.accent} />
              <Text style={styles.catText}>{params.categoryName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.priceAccent}>{formatPrice(total)}</Text>
          <Text style={styles.muted}>{params.serviceName}</Text>
          <View style={styles.divider} />
          <Detail
            icon="calendar-outline"
            label={`تاريخ الحجز: ${formatArabicDate(params.bookingDate)}`}
          />
          {params.checkOutDate ? (
            <Detail
              icon="log-out-outline"
              label={`المغادرة: ${formatArabicDate(params.checkOutDate)}${
                params.nights ? ` (${params.nights} ليلة)` : ''
              }`}
            />
          ) : null}
          {params.rooms ? (
            <Detail icon="bed-outline" label={`عدد الغرف: ${params.rooms}`} />
          ) : null}
          {params.periodLabel ? (
            <Detail icon="sunny-outline" label={params.periodLabel} />
          ) : null}
          {params.durationHours ? (
            <Detail
              icon="hourglass-outline"
              label={
                params.durationHours === 4
                  ? 'المدة: نصف يوم'
                  : `المدة: ${params.durationHours} ساعة`
              }
            />
          ) : null}
          {params.pickupPoint ? (
            <Detail icon="navigate-outline" label={`من: ${params.pickupPoint}`} />
          ) : null}
          {params.dropoffPoint ? (
            <Detail icon="flag-outline" label={`إلى: ${params.dropoffPoint}`} />
          ) : null}
          {params.deliveryTime ? (
            <Detail icon="bicycle-outline" label={`التسليم: ${params.deliveryTime}`} />
          ) : null}
          {params.capacityLabel ? (
            <Detail icon="people-outline" label={`عدد الأشخاص: ${params.capacityLabel.replace('أشخاص أو أقل', 'أو أقل')}`} />
          ) : null}
          {params.timeLabel || params.startTime ? (
            <Detail
              icon="time-outline"
              label={
                params.timeLabel ??
                `من ${String(params.startTime).slice(0, 5)} إلى ${String(params.endTime ?? '').slice(0, 5)}`
              }
            />
          ) : null}
          {params.quantity > 1 && !params.nights ? (
            <Detail icon="layers-outline" label={`الكمية: ${params.quantity}`} />
          ) : null}
        </View>

        {params.attendanceType ? (
          <>
            <Text style={styles.sectionLabel}>بيانات الحضور</Text>
            <View style={styles.card}>
              <Detail icon="person-outline" label={params.attendanceType} />
              {guestLine ? <Detail icon="people-outline" label={guestLine} /> : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>العربون</Text>
        <View style={styles.card}>
          <Text style={styles.muted}>
            سياسة المنشأة: عربون {depositPct}% لا يرجع مطلقاً ({formatPrice(depositAmount)})
          </Text>
        </View>

        <Text style={styles.sectionLabel}>عملة الدفع</Text>
        <Text style={styles.sectionHint}>
          تعتمد وسائل الدفع على العملة المختارة. بعض وسائل الدفع لا تقبل جميع العملات
        </Text>
        <Pressable style={styles.selectCard} onPress={() => setCurrencyOpen(true)}>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.selectValue}>{currencyLabel}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>لديك قسيمة تخفيض؟</Text>
        <View style={styles.couponRow}>
          <Pressable style={styles.verifyBtn}>
            <Text style={styles.verifyText}>تحقق</Text>
          </Pressable>
          <TextInput
            style={styles.couponInput}
            placeholder="......."
            placeholderTextColor="#A0AAB8"
            value={coupon}
            onChangeText={setCoupon}
            textAlign="right"
          />
        </View>

        <Text style={styles.sectionLabel}>وسائل الدفع</Text>
        <PayMethodRow
          label="حوالة"
          selected={payMethod === 'TRANSFER'}
          onPress={() => setPayMethod('TRANSFER')}
          icon="cash-outline"
        />
        <PayMethodRow
          label="محفظة جيب ( تحويل مشترك )"
          selected={payMethod === 'JEEB'}
          onPress={() => setPayMethod('JEEB')}
          icon="wallet-outline"
        />

        <View style={styles.totalCard}>
          <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
          <Text style={styles.totalLabel}>الإجمالي</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable disabled={loading} onPress={onContinue}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueText}>متابعة</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <CurrencyPickerSheet
        visible={currencyOpen}
        selectedCode={currency}
        onClose={() => setCurrencyOpen(false)}
        onSelect={(code: CurrencyCode) => {
          void setCurrency(code);
        }}
      />

      <PaymentTransferSheet
        visible={transferOpen}
        fullAmount={total}
        depositAmount={depositAmount}
        onClose={() => setTransferOpen(false)}
        onConfirm={onConfirmTransfer}
      />
    </SafeAreaView>
  );
}

function Detail({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailText}>{label}</Text>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
    </View>
  );
}

function PayMethodRow({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      style={[styles.payMethod, selected && styles.payMethodOn]}
      onPress={onPress}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.payMethodLabel}>{label}</Text>
      <View style={styles.payIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },
  headerSpacer: { width: 40 },
  scroll: { paddingHorizontal: 16, gap: 10 },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: 4,
  },
  heroSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  serviceImg: { width: 72, height: 72, borderRadius: 12 },
  imgFallback: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: { flex: 1, gap: 6, alignItems: 'flex-start' },
  serviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    width: '100%',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontSize: 12, fontWeight: '700', color: theme.colors.accent },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  priceAccent: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.accent,
    textAlign: 'right',
  },
  muted: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, flexShrink: 1 },
  sectionLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  sectionHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectValue: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  couponRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyBtn: {
    backgroundColor: '#F8F1E4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  verifyText: { color: theme.colors.accentDark, fontWeight: '800', fontSize: 13 },
  couponInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.primary,
  },
  payMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  payMethodOn: { borderColor: theme.colors.accent, backgroundColor: '#FCF8F0' },
  payMethodLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  payIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F3F6F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  totalCard: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
  totalAmount: { fontSize: 16, fontWeight: '800', color: theme.colors.accent },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  continueBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

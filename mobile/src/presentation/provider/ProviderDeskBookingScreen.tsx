import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { KeyboardAwareScrollView } from '@/core/ui/components/KeyboardAwareScrollView';
import { QuantityStepper } from '@/core/ui/components/QuantityStepper';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { OwnedService } from '../../data/remote/serviceApi';
import {
  addDaysIso,
  toIsoDate,
} from '../booking/bookingFlow';
import { RootStackParamList } from '../navigation/types';
import { OptionPickerSheet } from './OptionPickerSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'ProviderDeskBooking'>;

function todayIso() {
  const n = new Date();
  return toIsoDate(n.getFullYear(), n.getMonth(), n.getDate());
}

export function ProviderDeskBookingScreen({ route, navigation }: Props) {
  const { providerId } = route.params;
  const { container, formatPrice } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<OwnedService[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [nights, setNights] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await container.serviceApi.listMine(providerId);
      setServices(list);
      if (list[0]) setServiceId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الخدمات');
    } finally {
      setLoading(false);
    }
  }, [container, providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const checkOutDate = useMemo(
    () => (nights > 1 ? addDaysIso(date, nights) : undefined),
    [date, nights],
  );

  const estimate = useMemo(() => {
    if (!selected) return null;
    const unit = selected.basePrice ?? 0;
    return unit * Math.max(1, rooms) * Math.max(1, nights);
  }, [selected, rooms, nights]);

  const submit = async () => {
    if (!serviceId) {
      setError('اختر الغرفة أو الخدمة');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('أدخل تاريخاً بصيغة YYYY-MM-DD');
      return;
    }
    const name = guestName.trim();
    if (!name) {
      setError('أدخل اسم العميل');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const booking = await container.bookingRepository.createDesk({
        serviceId,
        date: date.trim(),
        checkOutDate,
        quantity: Math.max(1, rooms),
        guestName: name,
        guestPhone: guestPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      navigation.replace('BookingVoucher', {
        bookingId: booking.id,
        mode: 'provider',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إنشاء الحجز');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle}>حجز مكتبي</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        bottomOffset={40}
      >
        <Text style={styles.hint}>
          سجّل حجز عميل حضر للمنشأة مباشرة — بدون دفع عبر التطبيق، ويُؤكَّد فوراً.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>الخدمة / الغرفة</Text>
          <Pressable style={styles.select} onPress={() => setServiceOpen(true)}>
            <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.selectValue} numberOfLines={1}>
              {selected?.name ?? 'اختر الغرفة'}
            </Text>
          </Pressable>

          <View style={styles.field}>
            <Text style={styles.label}>تاريخ الدخول (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder={todayIso()}
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
              autoCapitalize="none"
            />
          </View>

          <QuantityStepper
            label="عدد الليالي"
            value={nights}
            onChange={(n) => setNights(Math.max(1, n ?? 1))}
            min={1}
          />
          <QuantityStepper
            label="عدد الغرف"
            value={rooms}
            onChange={(n) => setRooms(Math.max(1, n ?? 1))}
            min={1}
          />

          {checkOutDate ? (
            <Text style={styles.meta}>المغادرة: {checkOutDate}</Text>
          ) : null}
          {estimate != null ? (
            <Text style={styles.estimate}>التقدير: {formatPrice(estimate)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>بيانات العميل</Text>
          <View style={styles.field}>
            <Text style={styles.label}>الاسم</Text>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="اسم العميل"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>الهاتف (اختياري)</Text>
            <TextInput
              style={styles.input}
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="77xxxxxxx"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>ملاحظات</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="ملاحظات إضافية"
              placeholderTextColor={theme.colors.textSecondary}
              textAlign="right"
              multiline
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          disabled={saving}
          onPress={submit}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>تأكيد الحجز المكتبي</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>

      <OptionPickerSheet
        visible={serviceOpen}
        title="الغرفة / الخدمة"
        subtitle="اختر ما سيتم حجزه"
        options={services.map((s) => ({ id: s.id, name: s.name }))}
        selectedId={serviceId}
        onClose={() => setServiceOpen(false)}
        onSelect={(opt) => setServiceId(String(opt.id))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  estimate: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.accentDark,
    textAlign: 'right',
  },
  error: { color: theme.colors.error, textAlign: 'right', fontSize: 13 },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.55 },
});

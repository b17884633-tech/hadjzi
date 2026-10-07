import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { formatServicePrice } from '../../core/common/currency';
import { useApp } from '../../di/AppProvider';
import { ProviderProfile } from '../../data/remote/providerApi';
import { OwnedService } from '../../data/remote/serviceApi';
import { Booking } from '../../domain/model/Booking';
import { RootStackParamList } from '../navigation/types';
import {
  formatBookingDate,
  guestDisplayInfo,
  statusColors,
  statusLabel,
} from '../my_bookings/bookingUi';

type Props = NativeStackScreenProps<RootStackParamList, 'ProviderFacility'>;
type Tab = 'services' | 'bookings';

function providerStatusLabel(status?: string) {
  switch (status) {
    case 'APPROVED':
      return 'معتمدة';
    case 'PENDING_REVIEW':
      return 'قيد المراجعة';
    case 'REJECTED':
      return 'مرفوضة';
    case 'SUSPENDED':
      return 'معطّلة';
    default:
      return status ?? '—';
  }
}

export function ProviderFacilityScreen({ route, navigation }: Props) {
  const { providerId } = route.params;
  const { container, formatPrice, currency } = useApp();

  const [bootLoading, setBootLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [tab, setTab] = useState<Tab>('services');
  const [services, setServices] = useState<OwnedService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingQuery, setBookingQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [me, svc, bks] = await Promise.all([
      container.providerApi.getMineById(providerId),
      container.serviceApi.listMine(providerId),
      container.bookingRepository.listMine(),
    ]);

    // New rooms often have 0–1 nights open; calendar treats missing days as full.
    const today = new Date().toISOString().slice(0, 10);
    let healed = false;
    for (const s of svc) {
      const futureOpen = (s.availabilities ?? []).filter(
        (a) => a.date >= today && (a.availableCapacity ?? 0) > 0,
      ).length;
      if (futureOpen < 14) {
        const facilityUnits =
          typeof me.attributes?.inventory === 'number'
            ? me.attributes.inventory
            : typeof me.attributes?.units === 'number'
              ? me.attributes.units
              : undefined;
        const cap =
          facilityUnits ??
          (typeof s.attributes?.inventory === 'number'
            ? s.attributes.inventory
            : s.availabilities?.[0]?.totalCapacity ?? 1);
        await container.serviceApi.seedAvailabilities(s.id, {
          days: 90,
          totalCapacity: Math.max(1, Number(cap) || 1),
        });
        healed = true;
      }
    }

    const services = healed
      ? await container.serviceApi.listMine(providerId)
      : svc;

    setProvider(me);
    setServices(services);
    setBookings(bks.filter((b) => b.providerId === providerId));
  }, [container, providerId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setBootLoading(true);
      load()
        .catch(() => {
          if (active) setProvider(null);
        })
        .finally(() => {
          if (active) {
            setBootLoading(false);
            setRefreshing(false);
          }
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const deleteService = (svc: OwnedService) => {
    Alert.alert('حذف الخدمة', `هل تريد حذف «${svc.name}»؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setActionId(svc.id);
          try {
            await container.serviceApi.remove(svc.id);
            setServices((prev) => prev.filter((s) => s.id !== svc.id));
          } catch (e) {
            Alert.alert(
              'تعذر الحذف',
              e instanceof Error ? e.message : 'حاول مرة أخرى',
            );
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const completeBooking = async (b: Booking) => {
    setActionId(b.id);
    try {
      const updated = await container.bookingRepository.complete(b.id);
      setBookings((prev) => prev.map((x) => (x.id === b.id ? updated : x)));
    } catch (e) {
      Alert.alert(
        'تعذر الإكمال',
        e instanceof Error ? e.message : 'يمكن إكمال الحجوزات المؤكدة فقط',
      );
    } finally {
      setActionId(null);
    }
  };

  const cancelBooking = (b: Booking) => {
    Alert.alert('إلغاء الحجز', `إلغاء الحجز ${b.bookingNumber}؟`, [
      { text: 'تراجع', style: 'cancel' },
      {
        text: 'إلغاء الحجز',
        style: 'destructive',
        onPress: async () => {
          setActionId(b.id);
          try {
            const updated = await container.bookingRepository.cancel(b.id);
            setBookings((prev) =>
              prev.map((x) => (x.id === b.id ? updated : x)),
            );
          } catch (e) {
            Alert.alert(
              'تعذر الإلغاء',
              e instanceof Error ? e.message : 'حاول مرة أخرى',
            );
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === 'CONFIRMED').length,
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    const q = bookingQuery.trim().toLowerCase();
    if (!q) return bookings;

    const digits = q.replace(/\D/g, '');

    return bookings.filter((b) => {
      const guest = guestDisplayInfo(b);
      const name = (guest.name ?? '').toLowerCase();
      const phone = (guest.phone ?? '').toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');
      const isoDate = (b.bookingDate ?? '').slice(0, 10);
      const arDate = formatBookingDate(b.bookingDate).toLowerCase();
      const createdIso = (b.createdAt ?? '').slice(0, 10);
      const service = (b.service?.name ?? '').toLowerCase();
      const number = (b.bookingNumber ?? '').toLowerCase();

      if (name.includes(q)) return true;
      if (phone.includes(q) || (digits.length >= 3 && phoneDigits.includes(digits))) {
        return true;
      }
      if (isoDate.includes(q) || arDate.includes(q) || createdIso.includes(q)) {
        return true;
      }
      // Allow searching 14/10/2026 or 14-10-2026 style against ISO
      const slashDate = isoDate.split('-').reverse().join('/');
      const dashDate = isoDate.split('-').reverse().join('-');
      if (slashDate.includes(q) || dashDate.includes(q)) return true;
      if (service.includes(q) || number.includes(q)) return true;
      return false;
    });
  }, [bookings, bookingQuery]);

  if (bootLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <BackButton />
          <Text style={styles.topTitle}>المنشأة</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.empty}>تعذر تحميل المنشأة</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.topTitle} numberOfLines={1}>
          {provider.businessName}
        </Text>
        <Pressable
          style={styles.editBtn}
          onPress={() =>
            navigation.navigate('ProviderFacilityForm', { providerId })
          }
        >
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="business" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {provider.businessName}
            </Text>
            <Text style={styles.heroMeta}>
              {providerStatusLabel(provider.status)}
              {provider.city?.name ? ` · ${provider.city.name}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{services.length}</Text>
            <Text style={styles.statLabel}>خدمات</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{bookings.length}</Text>
            <Text style={styles.statLabel}>حجوزات</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{pendingCount}</Text>
            <Text style={styles.statLabel}>مؤكدة</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'services' && styles.tabOn]}
            onPress={() => setTab('services')}
          >
            <Text style={[styles.tabText, tab === 'services' && styles.tabTextOn]}>
              {/فنادق|فندق|hotel/i.test(provider.category?.name ?? '')
                ? 'الغرف'
                : /شالي|chalet/i.test(provider.category?.name ?? '')
                  ? 'الباقات'
                  : 'الخدمات'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'bookings' && styles.tabOn]}
            onPress={() => setTab('bookings')}
          >
            <Text style={[styles.tabText, tab === 'bookings' && styles.tabTextOn]}>
              الحجوزات
            </Text>
          </Pressable>
        </View>

        {tab === 'services' ? (
          <View style={styles.section}>
            <Pressable
              style={styles.addRow}
              onPress={() =>
                navigation.navigate('ProviderServiceForm', { providerId })
              }
            >
              <Ionicons name="add-circle" size={22} color={theme.colors.accentDark} />
              <Text style={styles.addRowText}>
                {/فنادق|فندق|hotel/i.test(provider.category?.name ?? '')
                  ? 'إضافة غرفة'
                  : /شالي|chalet/i.test(provider.category?.name ?? '')
                    ? 'إضافة باقة'
                    : 'إضافة خدمة'}
              </Text>
            </Pressable>

            {services.length === 0 ? (
              <Text style={styles.empty}>
                {/فنادق|فندق|hotel/i.test(provider.category?.name ?? '')
                  ? 'لا توجد غرف — أضف غرفاً تظهر في صفحة التفاصيل.'
                  : /شالي|chalet/i.test(provider.category?.name ?? '')
                    ? 'لا توجد باقات — أضف باقات تظهر في قسم «الغرف والباقات».'
                    : 'لا توجد خدمات — أضف خدمات تظهر في صفحة التفاصيل.'}
              </Text>
            ) : (
              services.map((svc) => (
                <View key={svc.id} style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{svc.name}</Text>
                    <Text style={styles.cardMeta}>
                      {formatServicePrice(svc.attributes, svc.basePrice, currency) ??
                        formatPrice(svc.basePrice)}
                      {svc.categoryName ? ` · ${svc.categoryName}` : ''}
                      {` · ${(svc.images ?? []).length} صور`}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.iconAction}
                      onPress={() =>
                        navigation.navigate('ProviderServiceForm', {
                          providerId,
                          serviceId: svc.id,
                        })
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.iconAction}
                      disabled={actionId === svc.id}
                      onPress={() => deleteService(svc)}
                    >
                      {actionId === svc.id ? (
                        <ActivityIndicator size="small" color={theme.colors.error} />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.error}
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Pressable
              style={styles.addRow}
              onPress={() =>
                navigation.navigate('ProviderDeskBooking', { providerId })
              }
            >
              <Ionicons name="add-circle" size={22} color={theme.colors.accentDark} />
              <Text style={styles.addRowText}>حجز مكتبي (بدون دفع)</Text>
            </Pressable>

            {bookings.length > 0 ? (
              <View style={styles.searchBox}>
                <TextInput
                  style={styles.searchInput}
                  value={bookingQuery}
                  onChangeText={setBookingQuery}
                  placeholder="ابحث بالاسم أو الهاتف أو التاريخ"
                  placeholderTextColor={theme.colors.textSecondary}
                  textAlign="right"
                />
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </View>
            ) : null}

            {bookings.length === 0 ? (
              <Text style={styles.empty}>لا توجد حجوزات على هذه المنشأة بعد.</Text>
            ) : filteredBookings.length === 0 ? (
              <Text style={styles.empty}>لا توجد نتائج مطابقة لبحثك.</Text>
            ) : (
              filteredBookings.map((b) => {
                const colors = statusColors(b.status);
                const busy = actionId === b.id;
                const guest = guestDisplayInfo(b);
                return (
                  <Pressable
                    key={b.id}
                    style={styles.card}
                    onPress={() =>
                      navigation.navigate('BookingVoucher', {
                        bookingId: b.id,
                        mode: 'provider',
                      })
                    }
                  >
                    <View style={styles.cardBody}>
                      <View style={styles.bookingHead}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {b.service?.name ?? 'خدمة'}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.badgeText, { color: colors.text }]}>
                            {statusLabel(b.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {b.bookingNumber} · {formatBookingDate(b.bookingDate)}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {guest.name}
                        {guest.phone ? ` · ${guest.phone}` : ''}
                        {guest.isDesk ? ' · مكتبي' : ''}
                      </Text>
                      <Text style={styles.priceLine}>
                        {formatPrice(b.totalAmount)}
                      </Text>
                      <View style={styles.bookingActions}>
                        {b.status === 'CONFIRMED' ? (
                          <Pressable
                            style={styles.smallBtn}
                            disabled={busy}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              void completeBooking(b);
                            }}
                          >
                            <Text style={styles.smallBtnText}>إكمال</Text>
                          </Pressable>
                        ) : null}
                        {b.status === 'CONFIRMED' ||
                        b.status === 'PENDING_PAYMENT' ? (
                          <Pressable
                            style={[styles.smallBtn, styles.smallBtnDanger]}
                            disabled={busy}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              cancelBooking(b);
                            }}
                          >
                            <Text
                              style={[
                                styles.smallBtnText,
                                styles.smallBtnDangerText,
                              ]}
                            >
                              إلغاء
                            </Text>
                          </Pressable>
                        ) : null}
                        <View style={styles.detailsHint}>
                          <Text style={styles.detailsHintText}>التفاصيل</Text>
                          <Ionicons
                            name="chevron-back"
                            size={14}
                            color={theme.colors.primary}
                          />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
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
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  editBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F4EBDA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  heroMeta: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNum: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E8EDF5',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: theme.colors.surface },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tabTextOn: { color: theme.colors.primary },
  section: { gap: 10 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F4EBDA',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E4D3B0',
  },
  addRowText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.accentDark,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    padding: 0,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    paddingVertical: 28,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  cardActions: { justifyContent: 'center', gap: 8 },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  priceLine: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: 2,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  smallBtnDanger: { backgroundColor: '#FDECEC' },
  smallBtnDangerText: { color: theme.colors.error },
  detailsHint: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  detailsHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

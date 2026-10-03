import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Booking } from '../../domain/model/Booking';
import { RootStackParamList } from '../navigation/types';
import { LoginGate } from '../common/components/LoginGate';
import {
  BOOKING_FILTERS,
  BookingFilter,
  bookingImage,
  bookingTitle,
  formatBookingDate,
  statusColors,
  statusIcon,
  statusLabel,
} from './bookingUi';

const WHATSAPP_URL = 'https://wa.me/967700000000';

export function BookingHistoryScreen() {
  const { container, user, formatPrice } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BookingFilter>('ALL');

  const load = useCallback(async () => {
    if (!user) {
      setBookings([]);
      return;
    }
    const items = await container.bookingRepository.listMine();
    setBookings(items);
  }, [container, user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch(() => {
          if (active) setBookings([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (filter !== 'ALL' && b.status !== filter) return false;
      if (!q) return true;
      const hay = `${b.bookingNumber} ${bookingTitle(b)} ${b.service?.name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, filter, query]);

  if (!user) {
    return (
      <LoginGate
        title="حجوزاتي"
        message="خطوة واحدة فقط تفصلك عن إكمال حجزك معنا! اضغط على «تسجيل الدخول» لتبدأ رحلتك مع تطبيق حجزي."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حجوزاتي</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => Linking.openURL(WHATSAPP_URL)}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث باسم المنشأة أو رقم الحجز"
          placeholderTextColor="#A0AAB8"
          value={query}
          onChangeText={setQuery}
          textAlign="right"
        />
        <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {BOOKING_FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load().catch(() => undefined);
                setRefreshing(false);
              }}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>لا توجد حجوزات مطابقة.</Text>
          }
          renderItem={({ item }) => {
            const colors = statusColors(item.status);
            const image = bookingImage(item);
            const created = formatBookingDate(item.createdAt?.slice(0, 10) ?? item.bookingDate);
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  navigation.navigate('BookingVoucher', { bookingId: item.id })
                }
              >
                <View style={styles.cardTop}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Ionicons name="image-outline" size={22} color="#fff" />
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {bookingTitle(item)}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      #{item.bookingNumber} • {created}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.price}>{formatPrice(item.totalAmount)}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    <Ionicons name={statusIcon(item.status)} size={13} color={colors.text} />
                    <Text style={[styles.badgeText, { color: colors.text }]}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchBox: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    padding: 0,
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  chipTextOn: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  thumbFallback: {
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  cardTitle: {
    width: '100%',
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  cardMeta: {
    width: '100%',
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: '58%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  empty: {
    textAlign: 'center',
    marginTop: 48,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});

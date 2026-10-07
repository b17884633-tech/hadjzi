import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { BackButton } from '@/core/ui/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { AppNotification } from '../../domain/model/Notification';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncBookingNotifications,
  syncRemoteNotifications,
} from '../../data/local/notificationStorage';
import { formatArabicDate } from '../booking/bookingFlow';
import { RootStackParamList } from '../navigation/types';
import { LoginGate } from '../common/components/LoginGate';

function iconFor(kind: AppNotification['kind']): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'BOOKING_CONFIRMED':
      return 'checkmark-circle-outline';
    case 'BOOKING_CANCELLED':
    case 'BOOKING_EXPIRED':
      return 'close-circle-outline';
    case 'BOOKING_COMPLETED':
      return 'ribbon-outline';
    case 'FACILITY_STATUS':
      return 'business-outline';
    default:
      return 'notifications-outline';
  }
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = formatArabicDate(iso.slice(0, 10));
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} · ${hh}:${mm}`;
}

export function NotificationsScreen() {
  const { user, container } = useApp();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { forceRemote?: boolean }) => {
    if (user) {
      try {
        await syncRemoteNotifications(container.notificationApi, {
          force: opts?.forceRemote === true,
        });
      } catch {
        /* ignore remote sync errors */
      }
      try {
        const bookings = await container.bookingRepository.listMine();
        await syncBookingNotifications(bookings);
      } catch {
        /* ignore sync errors */
      }
      try {
        await container.notificationApi.markAllRead();
      } catch {
        /* ignore */
      }
    }
    const list = await listNotifications();
    setItems(list);
    await markAllNotificationsRead();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      // Throttled remote sync on focus — pull-to-refresh uses force.
      load()
        .catch(() => {
          if (active) setItems([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  if (!user) {
    return (
      <LoginGate
        title="الاشعارات"
        message="سجّل الدخول لعرض إشعارات حجوزاتك."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>الاشعارات</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load({ forceRemote: true }).catch(() => undefined);
                setRefreshing(false);
              }}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={28}
                  color="#0F766E"
                />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إشعارات بعد</Text>
              <Text style={styles.emptyHint}>
                ستظهر هنا تحديثات حجوزاتك مثل الاستلام والتأكيد والإلغاء.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={async () => {
                await markNotificationRead(item.id);
                if (item.bookingId) {
                  navigation.navigate('BookingVoucher', {
                    bookingId: item.bookingId,
                  });
                }
              }}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={iconFor(item.kind)}
                  size={22}
                  color="#0F766E"
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBodyText}>{item.body}</Text>
                <Text style={styles.cardTime}>{timeLabel(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerSpacer: { width: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardUnread: {
    borderColor: theme.colors.teal,
    backgroundColor: '#F3FAF8',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardTime: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

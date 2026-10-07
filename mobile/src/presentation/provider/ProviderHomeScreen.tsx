import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { saveUserSession } from '../../data/local/sessionStorage';
import { ProviderProfile } from '../../data/remote/providerApi';
import { RootStackParamList } from '../navigation/types';

function statusLabel(status?: string) {
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

export function ProviderHomeScreen() {
  const { container, user, setUser } = useApp();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [facilities, setFacilities] = useState<ProviderProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await container.providerApi.listMine();
      setFacilities(list);
      if (list.length && user && user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
        const next = { ...user, role: 'PROVIDER' as const };
        await saveUserSession(next);
        setUser(next);
      }
    } catch (e) {
      // Not a provider yet or API error — empty list is fine for first-time
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) {
        setFacilities([]);
      } else {
        setError(e instanceof Error ? e.message : 'تعذر تحميل المنشآت');
        setFacilities([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [container, setUser, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

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
        <Text style={styles.topTitle}>منشآتي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Text style={styles.lead}>
          أنشئ منشآت متعددة (فنادق، شاليهات، صالات…) وأدر خدمات وحجوزات كل منشأة على حدة.
        </Text>

        <Pressable
          style={styles.addRow}
          onPress={() => navigation.navigate('ProviderFacilityForm', {})}
        >
          <Ionicons name="add-circle" size={22} color={theme.colors.accentDark} />
          <Text style={styles.addRowText}>إضافة منشأة جديدة</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {facilities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="business-outline" size={36} color={theme.colors.accent} />
            <Text style={styles.emptyTitle}>لا توجد منشآت بعد</Text>
            <Text style={styles.emptyBody}>
              ابدأ بإضافة منشأتك الأولى ثم أضف الخدمات والغرف داخلها.
            </Text>
          </View>
        ) : (
          facilities.map((f) => {
            const cover = f.images?.[0];
            return (
              <Pressable
                key={f.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('ProviderFacility', { providerId: f.id })
                }
              >
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {f.businessName}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {statusLabel(f.status)}
                    {f.category?.name ? ` · ${f.category.name}` : ''}
                    {f.city?.name ? ` · ${f.city.name}` : ''}
                  </Text>
                  {f.addressDetails ? (
                    <Text style={styles.cardAddr} numberOfLines={1}>
                      {f.addressDetails}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            );
          })
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
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  lead: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
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
  error: { color: theme.colors.error, textAlign: 'right', fontSize: 13 },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  emptyBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  cardAddr: {
    marginTop: 2,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
});

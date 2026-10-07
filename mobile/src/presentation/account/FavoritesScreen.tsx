import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { OfferCardSkeletonList } from '@/core/ui/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import {
  FavoriteProvider,
  getFavorites,
  removeFavorite,
} from '../../data/local/favoritesStorage';
import { BackButton } from '../../core/ui/components/BackButton';
import { useApp } from '../../di/AppProvider';
import { FeaturedOfferCard } from '../home/components/FeaturedOfferCard';
import { RootStackParamList } from '../navigation/types';

export function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useApp();
  const [items, setItems] = useState<FavoriteProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    const list = await getFavorites(user.id);
    setItems(list);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>المفضلة</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <OfferCardSkeletonList count={2} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {!user?.id ? (
            <View style={styles.emptyBox}>
              <Ionicons name="log-in-outline" size={40} color={theme.colors.accent} />
              <Text style={styles.emptyTitle}>سجّل الدخول لعرض المفضلة</Text>
              <Text style={styles.emptyBody}>
                المفضلة مرتبطة بحسابك — سجّل الدخول لحفظ المنشآت ومتابعتها
              </Text>
              <Pressable
                style={styles.loginBtn}
                onPress={() => navigation.navigate('Auth')}
              >
                <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="heart-outline" size={40} color={theme.colors.accent} />
              <Text style={styles.emptyTitle}>لا توجد مفضلات بعد</Text>
              <Text style={styles.emptyBody}>
                اضغط على القلب في صفحة المنشأة لحفظها هنا
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.cardWrap}>
                <FeaturedOfferCard
                  offer={{
                    id: item.id,
                    title: item.businessName,
                    price: item.price,
                    images: item.images,
                    image: item.image ?? item.images?.[0],
                    cityName: item.cityName,
                    regionName: item.regionName,
                    addressDetails: item.addressDetails,
                    categoryName: item.categoryName,
                    rating: item.rating,
                    verified: item.verified !== false,
                  }}
                  onPress={() =>
                    navigation.navigate('ProviderProfile', { providerId: item.id })
                  }
                />
                <Pressable
                  style={styles.removeBtn}
                  onPress={async () => {
                    await removeFavorite(item.id, user.id);
                    await load();
                  }}
                  accessibilityLabel="إزالة من المفضلة"
                >
                  <Ionicons name="heart" size={16} color="#E11D48" />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
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
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 4,
  },
  emptyBox: {
    marginTop: 48,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  cardWrap: {
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 2,
  },
});

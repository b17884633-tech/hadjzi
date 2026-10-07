import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { Destination } from '../../domain/model/Search';
import { getSelectedCity, saveSelectedCity } from '../../data/local/cityStorage';
import { RootStackParamList } from '../navigation/types';
import { CityPickerSheet } from '../home/components/CityPickerSheet';
import { CurrencyPickerSheet } from './CurrencyPickerSheet';
import { FeedbackSheet } from './FeedbackSheet';
import { LoginGate } from '../common/components/LoginGate';
import { NotificationBellButton } from '@/core/ui/components/NotificationBellButton';

const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
  { id: 4, name: 'الحديدة' },
  { id: 5, name: 'إب' },
  { id: 6, name: 'المكلا' },
];

const WHATSAPP_URL = 'https://wa.me/967700000000';
const SUPPORT_URL = 'https://wa.me/967700000000';

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
  onPress: () => void;
};

export function AccountScreen() {
  const { user, container, setUser, currencyLabel, currency, setCurrency } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [cities, setCities] = useState<Destination[]>(FALLBACK_CITIES);
  const [city, setCity] = useState<Destination>(FALLBACK_CITIES[0]);
  const [cityOpen, setCityOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getSelectedCity();
      if (!cancelled && stored) {
        setCity({ id: stored.id, name: stored.name });
      }
      try {
        const list = await container.searchRepository.getDestinations();
        if (!cancelled && list?.length) {
          setCities(list);
          if (stored) {
            const match = list.find((c) => c.id === stored.id || c.name === stored.name);
            if (match) setCity(match);
          } else {
            setCity(list[0]);
          }
        }
      } catch {
        /* keep fallbacks */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [container]);

  const onSelectCity = useCallback(async (next: Destination) => {
    setCity(next);
    await saveSelectedCity({ id: next.id, name: next.name });
  }, []);

  const shareApp = async () => {
    try {
      await Share.share({
        message: 'جرّب تطبيق حجزي لحجز الشاليهات والخدمات في اليمن ✨',
      });
    } catch {
      /* user cancelled */
    }
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>الحساب</Text>
      <View style={styles.headerActions}>
        <NotificationBellButton
          onPress={() => navigation.navigate('Notifications')}
          style={styles.iconBtn}
        />
        <Pressable
          style={styles.iconBtn}
          onPress={() => Linking.openURL(WHATSAPP_URL)}
        >
          <Ionicons name="logo-whatsapp" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );

  if (!user) {
    return <LoginGate title="الحساب" />;
  }

  const displayName = `${user.firstName} ${user.lastName}`.trim();

  const menuItems: MenuItem[] = [
    {
      key: 'add-facility',
      label:
        user.role === 'PROVIDER' || user.role === 'ADMIN'
          ? 'لوحة مقدّم الخدمة'
          : 'إضافة الخدمة الخاصة بك',
      icon: 'business-outline',
      highlight: true,
      onPress: () => navigation.navigate('ProviderHome'),
    },
    {
      key: 'favorites',
      label: 'المفضلة',
      icon: 'heart-outline',
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      key: 'settings',
      label: 'الإعدادات',
      icon: 'settings-outline',
      onPress: () => undefined,
    },
    {
      key: 'privacy',
      label: 'سياسة الخصوصية',
      icon: 'shield-checkmark-outline',
      onPress: () => undefined,
    },
    {
      key: 'feedback',
      label: 'تقديم شكوى أو مقترح',
      icon: 'chatbubble-ellipses-outline',
      onPress: () => setFeedbackOpen(true),
    },
    {
      key: 'support',
      label: 'قنوات التواصل والدعم الفني',
      icon: 'call-outline',
      onPress: () => Linking.openURL(SUPPORT_URL),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {header}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile — RTL: avatar right, logout left, text next to avatar */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName || 'مستخدم حجزي'}
            </Text>
            {user.phone ? (
              <Text style={styles.profilePhone} numberOfLines={1}>
                {user.phone}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={styles.logoutBtn}
            onPress={async () => {
              await container.authRepository.logout();
              setUser(null);
            }}
            accessibilityLabel="تسجيل الخروج"
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.primary} />
          </Pressable>
        </View>

        {/* City */}
        <Pressable style={styles.infoCard} onPress={() => setCityOpen(true)}>
          <View style={styles.infoRight}>
            <Ionicons name="location-sharp" size={18} color={theme.colors.primary} />
            <Text style={styles.infoValue}>{city.name}</Text>
          </View>
          <Text style={styles.infoLabel}>المدينة</Text>
        </Pressable>

        {/* Currency */}
        <Pressable style={styles.infoCard} onPress={() => setCurrencyOpen(true)}>
          <View style={styles.infoRight}>
            <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoValue}>{currencyLabel}</Text>
          </View>
          <Text style={styles.infoLabel}>عملة العرض</Text>
        </Pressable>

        {/* Menu */}
        <View style={styles.menuBlock}>
          {menuItems.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.menuRow, item.highlight && styles.menuHighlight]}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
              <Text
                style={[styles.menuLabel, item.highlight && styles.menuLabelHighlight]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Ionicons
                name={item.highlight ? 'open-outline' : 'chevron-back'}
                size={16}
                color={theme.colors.primary}
              />
            </Pressable>
          ))}
        </View>

        {/* Brand / share */}
        <View style={styles.brandCard}>
          <View style={styles.brandInner}>
            <View style={styles.brandCenter}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.brandLogo}
              />
              {/* <Text style={styles.brandName}>حجزي</Text> */}
            </View>

            <View style={styles.socialCol}>
              <Pressable
                style={styles.socialBtn}
                onPress={() => Linking.openURL('https://instagram.com')}
              >
                <Ionicons name="logo-instagram" size={18} color={theme.colors.primary} />
              </Pressable>
              <Pressable
                style={styles.socialBtn}
                onPress={() => Linking.openURL('https://facebook.com')}
              >
                <Ionicons name="logo-facebook" size={18} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.shareBtn} onPress={shareApp}>
            <Ionicons name="paper-plane-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.shareLabel}>شارك التطبيق مع أصدقائك!</Text>
          </Pressable>
        </View>

        <Text style={styles.powered}>
          Powered by <Text style={styles.poweredBold}>Hadjzi</Text>
        </Text>
        <Text style={styles.version}>version 0.1.0</Text>
      </ScrollView>

      <CityPickerSheet
        visible={cityOpen}
        cities={cities}
        selectedCityId={city.id}
        onClose={() => setCityOpen(false)}
        onSelect={onSelectCity}
      />

      <CurrencyPickerSheet
        visible={currencyOpen}
        selectedCode={currency}
        onClose={() => setCurrencyOpen(false)}
        onSelect={(code) => {
          void setCurrency(code);
        }}
      />

      <FeedbackSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={async (message) => {
          await container.disputeApi.create({ reason: message });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F6F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  scroll: {
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 10,
  },

  /* Profile */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  profileText: {
    flex: 1,
    justifyContent: 'center',
    // Under forceRTL, column cross-axis start = physical right
    alignItems: 'flex-start',
    gap: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    width: '100%',
  },
  profilePhone: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: '100%',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Info cards */
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },

  /* Menu */
  menuBlock: {
    gap: 10,
    marginTop: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  menuHighlight: {
    backgroundColor: '#F8F1E4',
    borderColor: theme.colors.accent,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  menuLabelHighlight: {
    color: theme.colors.accentDark,
  },

  /* Brand */
  brandCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    gap: 16,
  },
  brandInner: {
    position: 'relative',
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialCol: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: 10,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCenter: {
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    width: 88,
    height: 88,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.tealLight,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  shareLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  powered: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  poweredBold: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
});

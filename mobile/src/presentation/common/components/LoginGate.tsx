import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../core/ui/theme';
import { RootStackParamList } from '../../navigation/types';

const WHATSAPP_URL = 'https://wa.me/967700000000';

type LoginGateProps = {
  title: string;
  message?: string;
};

const DEFAULT_MESSAGE =
  'خطوة واحدة فقط تفصلك عن إكمال حجزك معنا! اضغط على «تسجيل الدخول» لتبدأ رحلتك مع تطبيق حجزي.';

/** Shared logged-out gate used by Account + My Bookings tabs. */
export function LoginGate({ title, message = DEFAULT_MESSAGE }: LoginGateProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => Linking.openURL(WHATSAPP_URL)}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </Pressable>
        </View>
      </View>

      <View style={styles.gateBody}>
        <View style={styles.door}>
          <Ionicons name="person" size={52} color={theme.colors.primary} />
        </View>
        <Text style={styles.gateCopy}>{message}</Text>
        <Pressable
          style={styles.loginCta}
          onPress={() => navigation.navigate('Auth')}
        >
          <View style={styles.loginIcon}>
            <Ionicons name="log-in-outline" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.loginLabel}>تسجيل الدخول</Text>
        </Pressable>
      </View>
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
  gateBody: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 40,
  },
  door: {
    width: 120,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateCopy: {
    fontSize: 14,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  loginCta: {
    alignSelf: 'stretch',
    height: 54,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

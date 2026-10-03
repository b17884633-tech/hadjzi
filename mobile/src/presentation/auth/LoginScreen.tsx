import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { AuthStackParamList } from '../navigation/types';
import { CountryPickerSheet } from './CountryPickerSheet';
import { OtpVerifySheet } from './OtpVerifySheet';
import { DEFAULT_COUNTRY, buildE164, Country } from './countries';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type Channel = 'SMS' | 'WHATSAPP';

export function LoginScreen({ navigation }: Props) {
  const { container, setUser } = useApp();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [channel, setChannel] = useState<Channel>('SMS');
  const [countryOpen, setCountryOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [fullPhone, setFullPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const requestOtp = async () => {
    const phone = buildE164(country.dialCode, national);
    if (national.replace(/\D/g, '').length < 7) {
      setError('أدخل رقم هاتف صحيح');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await container.authRepository.requestPhoneLogin(phone, channel);
      if (result.kind === 'requires_register') {
        navigation.navigate('Register', { phone, channel });
        return;
      }
      setFullPhone(phone);
      setOtpOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      const tokens = await container.authRepository.verifyOtp(fullPhone, code);
      setUser(tokens.user);
      setOtpOpen(false);
      navigation.getParent()?.goBack();
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'رمز التحقق غير صحيح');
    } finally {
      setOtpLoading(false);
    }
  };

  const resend = async () => {
    setOtpError(null);
    try {
      await container.authRepository.requestPhoneLogin(fullPhone, channel);
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'تعذر إعادة الإرسال');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.logoArea}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logo}
            />
            {/* <Text style={styles.brandAr}>حجزي</Text> */}
          </View>

          <View style={styles.form}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>تسجيل الدخول</Text>
              <View style={styles.underlineRow}>
                <View style={styles.titleUnderline} />
              </View>
            </View>
            <Text style={styles.subtitle}>قم بتسجيل الدخول لاستخدام تطبيق حجزي</Text>

            <View style={styles.phoneField}>
              <Pressable style={styles.countryBtn} onPress={() => setCountryOpen(true)}>
                <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.dial}>{country.dialCode}</Text>
                <Text style={styles.flag}>{country.flag}</Text>
              </Pressable>
              <View style={styles.divider} />
              <TextInput
                style={[styles.phoneInput, { textAlign: 'right', direction: 'ltr' }]}
                value={national}
                onChangeText={setNational}
                keyboardType="phone-pad"
                placeholder="رقم الهاتف"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Ionicons name="call-outline" size={18} color={theme.colors.textSecondary} />
            </View>

            <Text style={styles.channelPrompt}>كيف تريد استلام رمز التحقق؟</Text>
            <View style={styles.channelRow}>
              <Pressable
                style={[styles.channelCard, channel === 'WHATSAPP' && styles.channelActive]}
                onPress={() => setChannel('WHATSAPP')}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={styles.channelLabel}>واتساب</Text>
              </Pressable>

              <Pressable
                style={[styles.channelCard, channel === 'SMS' && styles.channelActive]}
                onPress={() => setChannel('SMS')}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.teal} />
                <Text style={styles.channelLabel}>رسالة نصية</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.cta, loading && styles.ctaDisabled]}
              onPress={requestOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.ctaIcon}>
                    <Ionicons name="enter-outline" size={18} color={theme.colors.teal} />
                  </View>
                  <Text style={styles.ctaLabel}>تسجيل الدخول</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CountryPickerSheet
        visible={countryOpen}
        selectedCode={country.code}
        onClose={() => setCountryOpen(false)}
        onSelect={setCountry}
      />

      <OtpVerifySheet
        visible={otpOpen}
        phone={fullPhone}
        channel={channel}
        loading={otpLoading}
        error={otpError}
        onClose={() => setOtpOpen(false)}
        onEdit={() => setOtpOpen(false)}
        onConfirm={verify}
        onResend={resend}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F9' },
  flex: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  logoArea: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  brandAr: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  form: {
    paddingBottom: 20,
    marginBottom: 12,
    width: '100%',
  },
  titleBlock: {
    width: '100%',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    width: '100%',
  },
  underlineRow: {
    width: '100%',
    flexDirection: 'row',
    // Under forceRTL, flex-start = physical right
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  titleUnderline: {
    width: 72,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.tealBright,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: '100%',
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 54,
    gap: 8,
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: 22,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flag: { fontSize: 18 },
  dial: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  divider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  channelPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    width: '100%',
    marginBottom: 12,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  channelCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  channelActive: {
    borderColor: theme.colors.teal,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C5CDD8',
  },
  channelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  error: {
    fontSize: 13,
    color: theme.colors.error,
    width: '100%',
    marginBottom: 12,
  },
  cta: {
    height: 54,
    borderRadius: 999,
    backgroundColor: theme.colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

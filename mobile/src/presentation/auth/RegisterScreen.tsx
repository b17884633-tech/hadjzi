import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { Destination } from '../../domain/model/Search';
import { AuthStackParamList } from '../navigation/types';
import { CityPickerSheet } from '../home/components/CityPickerSheet';
import { OtpVerifySheet } from './OtpVerifySheet';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type Gender = 'male' | 'female';

const FALLBACK_CITIES: Destination[] = [
  { id: 1, name: 'صنعاء' },
  { id: 2, name: 'عدن' },
  { id: 3, name: 'تعز' },
  { id: 4, name: 'الحديدة' },
  { id: 5, name: 'إب' },
  { id: 6, name: 'المكلا' },
];

export function RegisterScreen({ route, navigation }: Props) {
  const { phone, channel } = route.params;
  const { container, setUser } = useApp();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cities, setCities] = useState<Destination[]>(FALLBACK_CITIES);
  const [city, setCity] = useState<Destination>(FALLBACK_CITIES[0]);
  const [cityOpen, setCityOpen] = useState(false);
  const [gender, setGender] = useState<Gender>('male');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    container.searchRepository
      .getDestinations()
      .then((list) => {
        if (list?.length) {
          setCities(list);
          setCity(list[0]);
        }
      })
      .catch(() => undefined);
  }, [container]);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('أدخل الاسم واللقب');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await container.authRepository.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
        channel,
      });
      setOtpOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      const tokens = await container.authRepository.verifyOtp(phone, code);
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
    try {
      await container.authRepository.requestPhoneLogin(phone, channel);
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.title}>إنشاء حساب</Text>
            <View style={styles.underlineRow}>
              <View style={styles.underline} />
            </View>
          </View>
          <Text style={styles.subtitle}>
            يرجى إدخال بياناتك التالية لإنشاء حساب جديد
          </Text>

          {/* RTL row: first = right → الاسم then اللقب */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>الاسم</Text>
              <TextInput
                style={[styles.input, { textAlign: 'right', direction: 'ltr' }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="الاسم"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>اللقب</Text>
              <TextInput
                style={[styles.input, { textAlign: 'right', direction: 'ltr' }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="اللقب"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          <Text style={styles.label}>المحافظة</Text>
          <Pressable style={styles.select} onPress={() => setCityOpen(true)}>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.selectText}>{city.name}</Text>
          </Pressable>

          <Text style={styles.label}>الجنس</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.gender, gender === 'male' && styles.genderActive]}
              onPress={() => setGender('male')}
            >
              <View style={[styles.radio, gender === 'male' && styles.radioOn]} />
              <Text style={styles.genderLabel}>ذكر</Text>
            </Pressable>
            <Pressable
              style={[styles.gender, gender === 'female' && styles.genderActive]}
              onPress={() => setGender('female')}
            >
              <View style={[styles.radio, gender === 'female' && styles.radioOn]} />
              <Text style={styles.genderLabel}>أنثى</Text>
            </Pressable>
          </View>

          <Text style={styles.labelMuted}>تاريخ الميلاد (اختياري)</Text>
          <View style={styles.select}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.birthInput, { textAlign: 'right', direction: 'ltr' }]}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="تاريخ الميلاد"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={styles.ctaLabel}>تسجيل</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <CityPickerSheet
        visible={cityOpen}
        cities={cities}
        selectedCityId={city.id}
        onClose={() => setCityOpen(false)}
        onSelect={setCity}
      />

      <OtpVerifySheet
        visible={otpOpen}
        phone={phone}
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  titleBlock: {
    width: '100%',
    marginBottom: 6,
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
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  underline: {
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.tealBright,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: '100%',
    marginBottom: 18,
    lineHeight: 20,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  half: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    width: '100%',
    marginBottom: 6,
  },
  labelMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: '100%',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  birthInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  gender: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E8EDF5',
  },
  genderActive: {
    borderColor: theme.colors.teal,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C5CDD8',
  },
  radioOn: {
    borderColor: theme.colors.teal,
    backgroundColor: theme.colors.teal,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  error: {
    color: theme.colors.error,
    width: '100%',
    marginBottom: 8,
  },
  cta: {
    marginTop: 10,
    height: 54,
    borderRadius: 16,
    backgroundColor: theme.colors.tealBright,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

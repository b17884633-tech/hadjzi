import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { KeyboardAwareScrollView } from '@/core/ui/components/KeyboardAwareScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../core/ui/components/BackButton';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { saveUserSession } from '../../data/local/sessionStorage';
import { RootStackParamList } from '../navigation/types';

function mapUpdateError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string | string[] } } })
      .response?.data?.message;
    const text = Array.isArray(message) ? message[0] : message;
    if (typeof text === 'string' && text.toLowerCase().includes('email')) {
      return 'البريد الإلكتروني مستخدم مسبقاً';
    }
    if (typeof text === 'string' && text.trim()) {
      return text;
    }
  }
  return error instanceof Error ? error.message : 'تعذر حفظ التعديلات';
}

export function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser, container } = useApp();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>الإعدادات</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>يجب تسجيل الدخول أولاً</Text>
        </View>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('أدخل الاسم واللقب');
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const { data } = await container.userApi.updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
      });
      const next = data.data;
      await saveUserSession(next);
      setUser(next);
      setSaved(true);
    } catch (e) {
      setError(mapUpdateError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} bottomOffset={40}>
        <Text style={styles.subtitle}>عدّل بيانات حسابك الشخصية</Text>

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

        <Text style={styles.label}>رقم الهاتف</Text>
        <View style={styles.readOnlyField}>
          <Ionicons name="call-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.readOnlyValue} numberOfLines={1}>
            {user.phone}
          </Text>
          <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textSecondary} />
        </View>
        <Text style={styles.hint}>لا يمكن تعديل رقم الهاتف</Text>

        <Text style={styles.label}>البريد الإلكتروني (اختياري)</Text>
        <TextInput
          style={[styles.input, styles.fullInput, { textAlign: 'left', direction: 'ltr' }]}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.success}>تم حفظ التعديلات بنجاح</Text> : null}

        <Pressable
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.ctaLabel}>حفظ التعديلات</Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
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
  fullInput: {
    marginBottom: 8,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2F7',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  readOnlyValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    width: '100%',
    marginTop: 6,
    marginBottom: 8,
  },
  error: {
    color: theme.colors.error,
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
  },
  success: {
    color: theme.colors.teal,
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '700',
  },
  cta: {
    marginTop: 16,
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});

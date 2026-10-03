import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../core/ui/components/Screen';
import { TextField } from '../../core/ui/components/TextField';
import { Button } from '../../core/ui/components/Button';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const { container, setUser } = useApp();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const tokens = await container.authRepository.verifyOtp(phone, code);
      setUser(tokens.user);
      navigation.getParent()?.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>

      <TextField
        label="OTP Code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Verify" onPress={handleVerify} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  error: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
    marginVertical: theme.spacing.sm,
  },
});

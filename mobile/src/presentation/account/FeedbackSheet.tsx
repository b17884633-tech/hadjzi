import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (message: string) => Promise<void> | void;
};

export function FeedbackSheet({ visible, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = message.trim().length >= 3 && !sending;

  const handleClose = () => {
    setMessage('');
    setSent(false);
    setSending(false);
    setError(null);
    onClose();
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit?.(message.trim());
      setSent(true);
      setTimeout(handleClose, 900);
    } catch (e: unknown) {
      const axiosMsg =
        typeof e === 'object' &&
        e &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: unknown } } }).response?.data
          ?.message !== 'undefined'
          ? (e as { response: { data: { message: string | string[] } } }).response.data
              .message
          : null;
      setError(
        Array.isArray(axiosMsg)
          ? axiosMsg.join('، ')
          : typeof axiosMsg === 'string'
            ? axiosMsg
            : e instanceof Error
              ? e.message
              : 'تعذر إرسال الرسالة. حاول مرة أخرى.',
      );
      setSending(false);
    }
  };

  return (
    <SmoothBottomSheet
      visible={visible}
      onClose={handleClose}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>تقديم شكوى أو مقترح</Text>
        <Text style={styles.subtitle}>
          يمكنك تقديم شكوى او مقترح لتحسين الخدمه
        </Text>

        {sent ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={40} color={theme.colors.accent} />
            <Text style={styles.successText}>تم إرسال رسالتك بنجاح</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="تفاصيل الرسالة"
              placeholderTextColor="#A0AAB8"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlign="right"
              textAlignVertical="top"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable disabled={!canSend} onPress={handleSend}>
              <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.sendBtn, !canSend && styles.sendDisabled]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    <Text style={styles.sendText}>ارسال</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: theme.colors.primary,
    backgroundColor: '#fff',
    marginBottom: 18,
  },
  sendBtn: {
    height: 52,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendDisabled: { opacity: 0.45 },
  sendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  successBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  successText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 12,
  },
});

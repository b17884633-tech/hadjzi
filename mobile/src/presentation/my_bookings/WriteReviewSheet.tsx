import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';

const STAR_GOLD = '#E8B923';
const STAR_EMPTY = '#D5DCE5';

type Props = {
  visible: boolean;
  facilityName?: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; comment: string }) => Promise<void>;
};

export function WriteReviewSheet({
  visible,
  facilityName,
  onClose,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRating(0);
    setComment('');
    setSending(false);
    setSent(false);
    setError(null);
  }, [visible]);

  const canSend = rating >= 1 && rating <= 5 && !sending;

  const handleClose = () => {
    onClose();
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      setSent(true);
      setTimeout(handleClose, 900);
    } catch (e: unknown) {
      const axiosMsg =
        typeof e === 'object' &&
        e &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message !== 'undefined'
          ? (e as { response: { data: { message: string | string[] } } })
              .response.data.message
          : null;
      setError(
        Array.isArray(axiosMsg)
          ? axiosMsg.join('، ')
          : typeof axiosMsg === 'string'
            ? axiosMsg
            : e instanceof Error
              ? e.message
              : 'تعذر إرسال التقييم',
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
      <Text style={styles.title}>قيّم تجربتك</Text>
      <Text style={styles.subtitle}>
        {facilityName
          ? `كيف كانت زيارتك لـ«${facilityName}»؟`
          : 'اختر تقييمك واكتب تعليقاً اختيارياً'}
      </Text>

      {sent ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={40} color={theme.colors.accent} />
          <Text style={styles.successText}>شكراً لتقييمك</Text>
        </View>
      ) : (
        <>
          <View style={styles.starsPick}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={n <= rating ? STAR_GOLD : STAR_EMPTY}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="اكتب تعليقك (اختياري)"
            placeholderTextColor="#A0AAB8"
            value={comment}
            onChangeText={setComment}
            multiline
            textAlign="right"
            textAlignVertical="top"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendDisabled]}
            disabled={!canSend}
            onPress={() => void handleSend()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>إرسال التقييم</Text>
            )}
          </Pressable>
        </>
      )}
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
  starsPick: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: theme.colors.primary,
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  sendBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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

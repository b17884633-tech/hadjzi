import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { SmoothBottomSheet } from '../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../core/ui/theme';

interface OtpVerifySheetProps {
  visible: boolean;
  phone: string;
  channel: 'SMS' | 'WHATSAPP';
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onConfirm: (code: string) => void;
  onResend: () => void;
}

export function OtpVerifySheet({
  visible,
  phone,
  channel,
  loading,
  error,
  onClose,
  onEdit,
  onConfirm,
  onResend,
}: OtpVerifySheetProps) {
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(5 * 60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) {
      setCode('');
      setSeconds(5 * 60);
      return;
    }
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    const focus = setTimeout(() => inputRef.current?.focus(), 350);
    return () => {
      clearInterval(id);
      clearTimeout(focus);
    };
  }, [visible]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const channelLabel = channel === 'WHATSAPP' ? 'واتساب' : 'رسالة نصية';

  return (
    <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>رمز التحقق</Text>
            <Pressable style={styles.editBtn} onPress={onEdit}>
              <Ionicons name="pencil" size={14} color={theme.colors.teal} />
              <Text style={styles.editText}>تعديل</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            يرجى إدخال رمز التحقق المرسل لـ {phone}
          </Text>

          <View style={styles.banner}>
            <Ionicons
              name={channel === 'WHATSAPP' ? 'logo-whatsapp' : 'chatbubble-ellipses'}
              size={18}
              color={theme.colors.teal}
            />
            <Text style={styles.bannerText}>
              تم إرسال رمز التحقق عبر {channelLabel}
            </Text>
          </View>

          <Pressable style={styles.codeBox} onPress={() => inputRef.current?.focus()}>
            <View style={styles.dots}>
              {Array.from({ length: 6 }, (_, i) => {
                const digit = code[i];
                return (
                  <View key={i} style={styles.dotSlot}>
                    {digit ? (
                      <Text style={styles.digit}>{digit}</Text>
                    ) : (
                      <View style={styles.dot} />
                    )}
                  </View>
                );
              })}
            </View>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.hiddenInput}
              caretHidden
            />
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {seconds > 0 ? (
            <Text style={styles.timer}>إعادة إرسال الكود بعد {mm}:{ss}</Text>
          ) : (
            <Pressable onPress={onResend}>
              <Text style={styles.resend}>إعادة إرسال الكود</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.confirm, (code.length < 6 || loading) && styles.confirmDisabled]}
            disabled={code.length < 6 || loading}
            onPress={() => onConfirm(code)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <View style={styles.confirmIcon}>
                  <Ionicons name="checkmark" size={16} color={theme.colors.teal} />
                </View>
                <Text style={styles.confirmLabel}>تأكيد</Text>
              </>
            )}
          </Pressable>
    </SmoothBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.tealBright,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.teal,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    width: '100%',
    lineHeight: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.tealLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.teal,
  },
  codeBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingVertical: 18,
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  dotSlot: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C5CDD8',
  },
  digit: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  error: {
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
  },
  timer: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  resend: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.teal,
    textAlign: 'center',
  },
  confirm: {
    marginTop: 4,
    height: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmDisabled: {
    opacity: 0.55,
  },
  confirmIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

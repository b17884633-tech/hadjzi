import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from '../../../core/ui/components/KeyboardAwareScrollView';
import { SmoothBottomSheet } from '../../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import { useApp } from '../../../di/AppProvider';

type Props = {
  visible: boolean;
  fullAmount: number;
  depositAmount: number;
  onClose: () => void;
  onConfirm: (transferRef: string, payMode: 'FULL' | 'DEPOSIT') => Promise<void>;
};

export function PaymentTransferSheet({
  visible,
  fullAmount,
  depositAmount,
  onClose,
  onConfirm,
}: Props) {
  const { formatPrice } = useApp();
  const insets = useSafeAreaInsets();
  const [payMode, setPayMode] = useState<'FULL' | 'DEPOSIT'>('DEPOSIT');
  const [refNo, setRefNo] = useState('');
  const [loading, setLoading] = useState(false);

  const copy = async (value: string) => {
    try {
      await Share.share({ message: value });
    } catch {
      /* cancelled */
    }
  };

  return (
    <SmoothBottomSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
    >
          <Text style={styles.title}>محفظة جيب ( تحويل مشترك )</Text>
          <Text style={styles.subtitle}>أدخل بيانات الدفع لإتمام العملية</Text>

          <KeyboardAwareScrollView
            bounces={false}
            contentContainerStyle={styles.scroll}
            avoidKeyboard={false}
            bottomOffset={32}
          >
            <Text style={styles.section}>خيارات الدفع</Text>
            <View style={styles.payRow}>
              {/* RTL: first = right → العربون on the right */}
              <Pressable
                style={[styles.payCard, payMode === 'DEPOSIT' && styles.payCardOn]}
                onPress={() => setPayMode('DEPOSIT')}
              >
                <Text style={[styles.payCardTitle, payMode === 'DEPOSIT' && styles.payOn]}>
                  دفع العربون
                </Text>
                <Text style={[styles.payCardAmount, payMode === 'DEPOSIT' && styles.payOn]}>
                  {formatPrice(depositAmount)}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.payCard, payMode === 'FULL' && styles.payCardOn]}
                onPress={() => setPayMode('FULL')}
              >
                <Text style={[styles.payCardTitle, payMode === 'FULL' && styles.payOn]}>
                  دفع كامل
                </Text>
                <Text style={[styles.payCardAmount, payMode === 'FULL' && styles.payOn]}>
                  {formatPrice(fullAmount)}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.section}>معلومات الحساب</Text>
            <View style={styles.accountCard}>
              <InfoRow
                label="اسم مستلم"
                value="تطبيق حجزي"
                onCopy={() => copy('تطبيق حجزي')}
              />
              <View style={styles.accountDivider} />
              <InfoRow
                label="رقم الحساب"
                value="968146"
                onCopy={() => copy('968146')}
              />
            </View>

            <Text style={styles.fieldLabel}>رقم الحوالة</Text>
            <TextInput
              style={styles.input}
              placeholder="رقم الحوالة"
              placeholderTextColor="#A0AAB8"
              value={refNo}
              onChangeText={setRefNo}
              textAlign="right"
            />
          </KeyboardAwareScrollView>

          <Pressable
            disabled={loading || !refNo.trim()}
            onPress={async () => {
              setLoading(true);
              try {
                await onConfirm(refNo.trim(), payMode);
              } finally {
                setLoading(false);
              }
            }}
          >
            <LinearGradient
              colors={[theme.colors.primaryLight, theme.colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.confirmBtn, (!refNo.trim() || loading) && { opacity: 0.55 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.confirmText}>تأكيد</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
    </SmoothBottomSheet>
  );
}

function InfoRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <View style={styles.infoRow}>
      {/* RTL: first = right → label/value on the right, copy on the left */}
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      <Pressable style={styles.copyBtn} onPress={onCopy} hitSlop={8}>
        <Ionicons name="copy-outline" size={18} color={theme.colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    maxHeight: '88%',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 20,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 0,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 10,
    marginTop: 8,
    textAlign: 'right',
  },
  payRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  payCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
    backgroundColor: '#fff',
  },
  payCardOn: {
    borderColor: theme.colors.accent,
    backgroundColor: '#F8F1E4',
  },
  payCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  payCardAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  payOn: { color: theme.colors.primary },
  accountCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 8,
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    width: '100%',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    width: '100%',
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: theme.colors.primary,
    backgroundColor: '#fff',
  },
  confirmBtn: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

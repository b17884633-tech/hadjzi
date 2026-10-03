import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../core/ui/theme';

export function TrustBanner() {
  return (
    <View style={styles.banner}>
      {/* RTL: first = right → shield on the right */}
      <Ionicons name="shield-checkmark" size={26} color={theme.colors.primary} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>حجزي موثوق 100%</Text>
        <Text style={styles.subtitle}>حجز آمن مع دعم العملاء على مدار الساعة</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.mint,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.mintDark,
  },
  textWrap: {
    flex: 1,
    // flex-start = RIGHT under forceRTL
    alignItems: 'flex-start',
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

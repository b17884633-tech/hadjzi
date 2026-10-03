import { Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../core/ui/components/Screen';
import { Button } from '../../core/ui/components/Button';
import { theme } from '../../core/ui/theme';
import { setWelcomeCompleted } from '../../data/local/onboardingStorage';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { markWelcomeComplete } = useApp();

  const handleStart = async () => {
    await setWelcomeCompleted();
    markWelcomeComplete();
    navigation.replace('Main');
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F8FC', '#E8EEF6']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>حجزي | hadjzi</Text>

        <Text style={styles.tagline}>
          منصتك الموثوقة لحجز القاعات، الشاليهات، الفنادق، والخدمات في اليمن
        </Text>

        <View style={styles.features}>
          <FeatureChip text="حجز آمن 100%" />
          <FeatureChip text="عروض حصرية" />
          <FeatureChip text="دفع مرن" />
        </View>

        <Button label="ابدأ الآن" onPress={handleStart} style={styles.cta} variant="primary" />
        <Text style={styles.footer}>مرحباً بك — اكتشف أفضل الخدمات بالقرب منك</Text>
      </View>
    </Screen>
  );
}

function FeatureChip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipDot} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  logoWrap: {
    marginBottom: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tagline: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 26,
    writingDirection: 'rtl',
  },
  features: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  chipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cta: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  footer: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

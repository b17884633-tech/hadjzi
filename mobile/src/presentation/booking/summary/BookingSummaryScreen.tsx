import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../core/ui/components/Screen';
import { Button } from '../../../core/ui/components/Button';
import { PriceBreakdownView } from '../../common/components/PriceBreakdownView';
import { theme } from '../../../core/ui/theme';
import { useApp } from '../../../di/AppProvider';
import { Booking } from '../../../domain/model/Booking';
import { RootStackParamList } from '../../navigation/types';

type Route = RouteProp<RootStackParamList, 'BookingSummary'>;

export function BookingSummaryScreen() {
  const { bookingId, draft } = useRoute<Route>().params;
  const { container } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bookingId) {
      container.bookingRepository
        .getById(bookingId)
        .then(setBooking)
        .catch(() => undefined);
    }
  }, [container, bookingId]);

  const handleLockAndPay = async () => {
    setLoading(true);
    try {
      const created = draft
        ? await container.lockBookingSlotUseCase.execute(draft)
        : booking!;
      const session = await container.confirmPaymentUseCase.execute(created.id, 'CARD');
      navigation.navigate('PaymentWebview', {
        checkoutUrl: session.checkoutUrl,
        bookingId: created.id,
      });
    } finally {
      setLoading(false);
    }
  };

  const data = booking;

  if (!data && !draft) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading booking...</Text>
      </Screen>
    );
  }

  const summary = data ?? {
    totalAmount: 0,
    depositPercentage: 30,
    depositAmount: 0,
    remainingAmount: 0,
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Booking Summary</Text>
      <PriceBreakdownView
        total={summary.totalAmount}
        depositPercentage={summary.depositPercentage}
        depositAmount={summary.depositAmount}
        remainingAmount={summary.remainingAmount}
      />
      <Button label="Pay Deposit" onPress={handleLockAndPay} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  loading: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});

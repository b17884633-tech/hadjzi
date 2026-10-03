import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Screen } from '../../core/ui/components/Screen';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';
import { ServiceItem } from '../../domain/model/Provider';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'ServiceList'>;

export function ServiceListScreen() {
  const { providerId } = useRoute<Route>().params;
  const { container, formatPrice } = useApp();
  const [services, setServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    container.providerApi
      .listServices(providerId)
      .then((res) => setServices(res.data.data))
      .catch(() => undefined);
  }, [container, providerId]);

  return (
    <Screen scroll={false}>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.type}>{item.bookingType}</Text>
            <Text style={styles.price}>
              {item.priceFrom != null || item.basePrice != null
                ? `من ${formatPrice((item.priceFrom ?? item.basePrice)!)}`
                : 'السعر عند الطلب'}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  type: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  price: {
    ...theme.typography.body,
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
  },
});

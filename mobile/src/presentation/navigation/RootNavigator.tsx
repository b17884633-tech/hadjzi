import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useApp } from '../../di/AppProvider';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { RootStackParamList } from './types';
import { WelcomeScreen } from '../welcome/WelcomeScreen';
import { ProviderProfileScreen } from '../provider/ProviderProfileScreen';
import { ServiceListScreen } from '../provider/ServiceListScreen';
import { SearchResultsScreen } from '../search/SearchResultsScreen';
import { BookingSummaryScreen } from '../booking/summary/BookingSummaryScreen';
import { BookingDateScreen } from '../booking/BookingDateScreen';
import { BookingCheckoutScreen } from '../booking/BookingCheckoutScreen';
import { PaymentWebviewScreen } from '../booking/checkout/PaymentWebviewScreen';
import { BookingVoucherScreen } from '../my_bookings/BookingVoucherScreen';
import { FavoritesScreen } from '../account/FavoritesScreen';
import { NotificationsScreen } from '../account/NotificationsScreen';
import { ProviderHomeScreen } from '../provider/ProviderHomeScreen';
import { ProviderFacilityScreen } from '../provider/ProviderFacilityScreen';
import { ProviderFacilityFormScreen } from '../provider/ProviderFacilityFormScreen';
import { ProviderServiceFormScreen } from '../provider/ProviderServiceFormScreen';
import { ProviderSlotScheduleScreen } from '../provider/ProviderSlotScheduleScreen';
import { ProviderDeskBookingScreen } from '../provider/ProviderDeskBookingScreen';
import { BackButton } from '../../core/ui/components/BackButton';
import { theme } from '../../core/ui/theme';
import { CAIRO } from '../../core/ui/theme/fonts';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isBootstrapping, hasCompletedWelcome } = useApp();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={hasCompletedWelcome ? 'Main' : 'Welcome'}
      screenOptions={{
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontFamily: CAIRO.bold,
        },
        headerTitleAlign: 'center',
        headerBackVisible: false,
        headerLeft: ({ canGoBack }) =>
          canGoBack ? <BackButton style={{ marginStart: 8 }} /> : null,
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthNavigator}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="ProviderProfile"
        component={ProviderProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServiceList"
        component={ServiceListScreen}
        options={{ title: 'الخدمات' }}
      />
      <Stack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={{ title: 'البحث' }}
      />
      <Stack.Screen
        name="BookingDate"
        component={BookingDateScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingCheckout"
        component={BookingCheckoutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingSummary"
        component={BookingSummaryScreen}
        options={{ title: 'ملخص الحجز' }}
      />
      <Stack.Screen
        name="PaymentWebview"
        component={PaymentWebviewScreen}
        options={{ title: 'الدفع' }}
      />
      <Stack.Screen
        name="BookingVoucher"
        component={BookingVoucherScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderHome"
        component={ProviderHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderFacility"
        component={ProviderFacilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderFacilityForm"
        component={ProviderFacilityFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderServiceForm"
        component={ProviderServiceFormScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderSlotSchedule"
        component={ProviderSlotScheduleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderDeskBooking"
        component={ProviderDeskBookingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

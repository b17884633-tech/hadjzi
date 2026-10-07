import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SearchScreen } from '../search/SearchScreen';
import { BookingHistoryScreen } from '../my_bookings/BookingHistoryScreen';
import { AccountScreen } from '../account/AccountScreen';
import { MainTabParamList } from './types';
import { MainTabBar } from './MainTabBar';
import { HomeNavigator } from './HomeNavigator';
import { theme } from '../../core/ui/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarBackground: () => null,
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ title: 'المنشآت' }} />
      <Tab.Screen name="Explore" component={SearchScreen} options={{ title: 'البحث' }} />
      <Tab.Screen
        name="MyBookings"
        component={BookingHistoryScreen}
        options={{ title: 'الحجوزات' }}
      />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'الحساب' }} />
    </Tab.Navigator>
  );
}

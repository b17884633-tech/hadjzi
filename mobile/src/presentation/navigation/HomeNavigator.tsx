import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../home/HomeScreen';
import { CategoryScreen } from '../categories/CategoryScreen';
import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
    </Stack.Navigator>
  );
}

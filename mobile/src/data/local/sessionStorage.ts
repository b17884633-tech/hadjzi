import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../domain/model/User';

const USER_SESSION_KEY = 'hadjzi.user_session';

export async function saveUserSession(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
}

export async function getUserSession(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as User;
}

export async function clearUserSession(): Promise<void> {
  await AsyncStorage.removeItem(USER_SESSION_KEY);
}

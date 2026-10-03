import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_COMPLETED_KEY = 'hadjzi.welcome_completed';

export async function hasCompletedWelcome(): Promise<boolean> {
  const value = await AsyncStorage.getItem(WELCOME_COMPLETED_KEY);
  return value === 'true';
}

export async function setWelcomeCompleted(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_COMPLETED_KEY, 'true');
}

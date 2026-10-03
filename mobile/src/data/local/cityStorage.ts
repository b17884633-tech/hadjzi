import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_CITY_KEY = 'hadjzi.selected_city';

export type StoredCity = {
  id: number;
  name: string;
};

export async function getSelectedCity(): Promise<StoredCity | null> {
  const raw = await AsyncStorage.getItem(SELECTED_CITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredCity;
  } catch {
    return null;
  }
}

export async function saveSelectedCity(city: StoredCity): Promise<void> {
  await AsyncStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city));
}

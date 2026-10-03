import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'hadjzi.favorites';

export type FavoriteProvider = {
  id: string;
  businessName: string;
  images?: string[];
  image?: string;
  cityName?: string;
  regionName?: string;
  addressDetails?: string;
  categoryName?: string;
  rating?: number;
  price?: number;
  verified?: boolean;
  savedAt: number;
};

export async function getFavorites(): Promise<FavoriteProvider[]> {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as FavoriteProvider[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function isFavorite(providerId: string): Promise<boolean> {
  const list = await getFavorites();
  return list.some((f) => f.id === providerId);
}

export async function addFavorite(item: Omit<FavoriteProvider, 'savedAt'>): Promise<void> {
  const list = await getFavorites();
  if (list.some((f) => f.id === item.id)) return;
  const next = [{ ...item, savedAt: Date.now() }, ...list];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
}

export async function removeFavorite(providerId: string): Promise<void> {
  const list = await getFavorites();
  const next = list.filter((f) => f.id !== providerId);
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
}

export async function toggleFavorite(
  item: Omit<FavoriteProvider, 'savedAt'>,
): Promise<boolean> {
  const exists = await isFavorite(item.id);
  if (exists) {
    await removeFavorite(item.id);
    return false;
  }
  await addFavorite(item);
  return true;
}

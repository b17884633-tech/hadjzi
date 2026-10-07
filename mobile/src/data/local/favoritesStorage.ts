import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserSession } from './sessionStorage';

const LEGACY_FAVORITES_KEY = 'hadjzi.favorites';

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

function favoritesKey(userId: string) {
  return `hadjzi.favorites.${userId}`;
}

async function resolveUserId(userId?: string | null): Promise<string | null> {
  if (userId) return userId;
  const session = await getUserSession();
  return session?.id ?? null;
}

/**
 * One-time: move legacy shared favorites into the current account, then delete
 * the device-wide key so other accounts never see them.
 */
async function migrateLegacyIfNeeded(userId: string): Promise<void> {
  const flagKey = `hadjzi.favorites.migrated.${userId}`;
  const already = await AsyncStorage.getItem(flagKey);
  if (already) return;

  const legacyRaw = await AsyncStorage.getItem(LEGACY_FAVORITES_KEY);
  if (legacyRaw) {
    const existing = await AsyncStorage.getItem(favoritesKey(userId));
    if (!existing) {
      await AsyncStorage.setItem(favoritesKey(userId), legacyRaw);
    }
    await AsyncStorage.removeItem(LEGACY_FAVORITES_KEY);
  }
  await AsyncStorage.setItem(flagKey, '1');
}

export async function getFavorites(userId?: string | null): Promise<FavoriteProvider[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];

  await migrateLegacyIfNeeded(uid);

  const raw = await AsyncStorage.getItem(favoritesKey(uid));
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as FavoriteProvider[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function isFavorite(
  providerId: string,
  userId?: string | null,
): Promise<boolean> {
  const list = await getFavorites(userId);
  return list.some((f) => f.id === providerId);
}

export async function addFavorite(
  item: Omit<FavoriteProvider, 'savedAt'>,
  userId?: string | null,
): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) return;

  const list = await getFavorites(uid);
  if (list.some((f) => f.id === item.id)) return;
  const next = [{ ...item, savedAt: Date.now() }, ...list];
  await AsyncStorage.setItem(favoritesKey(uid), JSON.stringify(next));
}

export async function removeFavorite(
  providerId: string,
  userId?: string | null,
): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) return;

  const list = await getFavorites(uid);
  const next = list.filter((f) => f.id !== providerId);
  await AsyncStorage.setItem(favoritesKey(uid), JSON.stringify(next));
}

export async function toggleFavorite(
  item: Omit<FavoriteProvider, 'savedAt'>,
  userId?: string | null,
): Promise<boolean> {
  const uid = await resolveUserId(userId);
  if (!uid) return false;

  const exists = await isFavorite(item.id, uid);
  if (exists) {
    await removeFavorite(item.id, uid);
    return false;
  }
  await addFavorite(item, uid);
  return true;
}

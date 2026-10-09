import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Native MapView crashes on Android release builds when
 * com.google.android.geo.API_KEY is missing. Only mount maps when a key
 * was baked into the binary (via app.config / EAS env).
 */
export function isNativeMapsEnabled(): boolean {
  const extra = Constants.expoConfig?.extra as
    | { mapsEnabled?: boolean; googleMapsApiKey?: string | null }
    | undefined;

  if (extra?.mapsEnabled === true) return true;
  if (extra?.googleMapsApiKey) return true;

  const androidKey = (
    Constants.expoConfig?.android as
      | { config?: { googleMaps?: { apiKey?: string } } }
      | undefined
  )?.config?.googleMaps?.apiKey;

  if (androidKey) return true;

  // Expo Go ships with a Maps key. iOS uses Apple Maps by default.
  if (Constants.appOwnership === 'expo') return true;
  if (Platform.OS === 'ios') return true;

  // Android release / preview builds crash without a key in the manifest.
  return false;
}

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Native Android MapView fatally crashes without a Google Maps API key
 * in the app manifest. Stay off until a non-empty key is baked in via
 * GOOGLE_MAPS_API_KEY_ANDROID / app.config.js.
 *
 * Do NOT enable for Expo Go / __DEV__ heuristics — custom EAS builds
 * still crash, and that is what users install from preview links.
 */
export function isNativeMapsEnabled(): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  const extra = Constants.expoConfig?.extra as
    | { mapsEnabled?: boolean; googleMapsApiKey?: string | null }
    | undefined;

  const fromExtra =
    (typeof extra?.googleMapsApiKey === 'string' &&
      extra.googleMapsApiKey.trim().length > 0 &&
      extra.mapsEnabled !== false) ||
    extra?.mapsEnabled === true;

  if (fromExtra) return true;

  const androidKey = (
    Constants.expoConfig?.android as
      | { config?: { googleMaps?: { apiKey?: string } } }
      | undefined
  )?.config?.googleMaps?.apiKey;

  return typeof androidKey === 'string' && androidKey.trim().length > 0;
}

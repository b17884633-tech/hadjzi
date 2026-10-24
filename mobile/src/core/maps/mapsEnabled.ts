import { Platform } from 'react-native';

/**
 * Native MapView is available on iOS/Android (Expo Go + dev builds).
 * Basemap is provided via free Esri street tiles (see RtlSafeMapView),
 * so a Google Maps SDK key is not required for the map surface to render.
 */
export function isNativeMapsEnabled(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

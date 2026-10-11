/**
 * Dynamic Expo config — wires Google Maps API key for Android builds.
 *
 * Sources (first match wins):
 * 1. process.env.GOOGLE_MAPS_API_KEY_ANDROID / GOOGLE_MAPS_API_KEY
 * 2. mobile/.env (gitignored)
 *
 * For EAS cloud builds, set the same var as an EAS secret:
 *   eas secret:create --name GOOGLE_MAPS_API_KEY_ANDROID --value "…" --scope project
 */
const fs = require('fs');
const path = require('path');
const appJson = require('./app.json');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

module.exports = () => {
  const mapsKey = (
    process.env.GOOGLE_MAPS_API_KEY_ANDROID ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  const staticMapsKey = (
    process.env.GOOGLE_MAPS_STATIC_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    mapsKey ||
    ''
  ).trim();

  const expo = structuredClone(appJson.expo);

  expo.plugins = (expo.plugins ?? []).map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name !== 'react-native-maps') return plugin;
    if (!mapsKey) return 'react-native-maps';
    return [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: mapsKey,
      },
    ];
  });

  // EAS profiles set EXPO_PUBLIC_API_BASE_URL → production Render API.
  // Local `expo start` keeps app.json (localhost) so __DEV__ can use LAN.
  const apiBaseUrl = (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    expo.extra?.apiBaseUrl ||
    'https://hadjzi.onrender.com/api'
  )
    .trim()
    .replace(/\/$/, '');

  expo.extra = {
    ...expo.extra,
    apiBaseUrl,
    googleMapsApiKey: mapsKey || null,
    googleMapsStaticApiKey: staticMapsKey || null,
    mapsEnabled: Boolean(mapsKey || staticMapsKey),
  };

  if (mapsKey) {
    expo.android = {
      ...expo.android,
      config: {
        ...(expo.android?.config ?? {}),
        googleMaps: {
          apiKey: mapsKey,
        },
      },
    };
  }

  return { expo };
};

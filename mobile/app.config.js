/**
 * Dynamic Expo config — wires Google Maps API key from env for EAS builds.
 * Set GOOGLE_MAPS_API_KEY_ANDROID (or GOOGLE_MAPS_API_KEY) in EAS secrets.
 */
const appJson = require('./app.json');

module.exports = () => {
  const mapsKey =
    process.env.GOOGLE_MAPS_API_KEY_ANDROID ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

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

  expo.extra = {
    ...expo.extra,
    googleMapsApiKey: mapsKey || null,
    mapsEnabled: Boolean(mapsKey),
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

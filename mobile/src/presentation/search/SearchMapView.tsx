import { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { WebView } from 'react-native-webview';
import { theme } from '../../core/ui/theme';
import { Provider } from '../../domain/model/Provider';
import { centerForCityName, coordsForProvider } from './mapGeo';

type Props = {
  cityName: string;
  providers: Provider[];
  loading: boolean;
  onOpenProvider: (id: string) => void;
  header: ReactNode;
};

type PinPayload = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

/**
 * Search map — Leaflet in a WebView (reliable tiles) with teal pins.
 * Tapping a pin opens the facility detail page.
 */
export function SearchMapView({
  cityName,
  providers,
  loading,
  onOpenProvider,
  header,
}: Props) {
  const cityCenter = useMemo(() => centerForCityName(cityName), [cityName]);

  const pins: PinPayload[] = useMemo(
    () =>
      providers.map((p) => {
        const c = coordsForProvider(p, cityCenter);
        return {
          id: p.id,
          name: p.businessName,
          lat: c.latitude,
          lng: c.longitude,
        };
      }),
    [providers, cityCenter],
  );

  const html = useMemo(
    () => buildMapHtml(cityCenter.latitude, cityCenter.longitude, pins),
    [cityCenter.latitude, cityCenter.longitude, pins],
  );

  return (
    <View style={styles.root}>
      <View style={styles.mapHost}>
        <WebView
          key={`${cityName}-${pins.length}`}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data) as {
                type?: string;
                id?: string;
              };
              if (data.type === 'open' && data.id) {
                onOpenProvider(data.id);
              }
            } catch {
              /* ignore */
            }
          }}
        />
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        {header}
        {loading ? (
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل المنشآت…</Text>
          </View>
        ) : providers.length === 0 ? (
          <View style={styles.emptyPill}>
            <Text style={styles.emptyText}>لا توجد منشآت في هذه المدينة</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function buildMapHtml(lat: number, lng: number, pins: PinPayload[]): string {
  const pinsJson = JSON.stringify(pins).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #EEF2F6; }
    .leaflet-control-attribution { font-size: 9px !important; }
    .hz-pin {
      width: 36px; height: 36px; margin-left: -18px; margin-top: -36px;
      background: #26C6DA; border: 2.5px solid #fff; border-radius: 18px 18px 18px 4px;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(13,27,62,0.28);
      display: flex; align-items: center; justify-content: center;
    }
    .hz-pin-inner {
      transform: rotate(45deg);
      color: #fff; font-size: 14px; line-height: 1;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var center = [${lat}, ${lng}];
      var pins = ${pinsJson};
      var map = L.map('map', {
        zoomControl: true,
        attributionControl: true
      }).setView(center, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      var icon = L.divIcon({
        className: '',
        html: '<div class="hz-pin"><span class="hz-pin-inner">⌂</span></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      var bounds = [];
      pins.forEach(function (p) {
        var m = L.marker([p.lat, p.lng], { icon: icon, title: p.name });
        m.on('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open', id: p.id }));
          }
        });
        m.addTo(map);
        bounds.push([p.lat, p.lng]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      }
    })();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF2F6' },
  mapHost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  overlay: { ...StyleSheet.absoluteFillObject },
  loadingPill: {
    alignSelf: 'center',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptyPill: {
    alignSelf: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});

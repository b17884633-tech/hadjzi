import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../core/ui/theme';
import { Provider } from '../../domain/model/Provider';
import { cheapestService } from '../../data/mappers/homeMappers';
import { centerForCityName, coordsForProvider } from './mapGeo';
import { latLngToTile, osmTileUrl, projectToPixels } from './osmTiles';

type Props = {
  cityName: string;
  providers: Provider[];
  loading: boolean;
  formatPrice: (amount: number) => string;
  onOpenProvider: (id: string) => void;
  header: ReactNode;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TILE = 256;
const ZOOM = 13;
const RADIUS = 1; // 3×3 tiles

/**
 * Search map:
 * 1) Prefer Google Static Maps when the Static API key works (billing on).
 * 2) Otherwise paint OpenStreetMap tiles locally (no Google billing needed).
 */
export function SearchMapView({
  cityName,
  providers,
  loading,
  formatPrice,
  onOpenProvider,
  header,
}: Props) {
  const [googleFailed, setGoogleFailed] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cityCenter = useMemo(() => centerForCityName(cityName), [cityName]);

  const extra = Constants.expoConfig?.extra as
    | {
        googleMapsStaticApiKey?: string | null;
        googleMapsApiKey?: string | null;
      }
    | undefined;

  const staticKey =
    extra?.googleMapsStaticApiKey?.trim() ||
    extra?.googleMapsApiKey?.trim() ||
    '';

  const googleStaticUri = useMemo(() => {
    if (!staticKey) return null;
    const { latitude: lat, longitude: lng } = cityCenter;
    const w = Math.min(640, Math.round(SCREEN_W));
    const h = Math.min(640, Math.round(SCREEN_H * 0.8));
    const markers = providers
      .slice(0, 15)
      .map((p) => {
        const c = coordsForProvider(p, cityCenter);
        return `&markers=color:0x0D1B3E%7C${c.latitude},${c.longitude}`;
      })
      .join('');
    return (
      `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${lat},${lng}&zoom=${ZOOM}&size=${w}x${h}&scale=2&maptype=roadmap` +
      markers +
      `&key=${staticKey}`
    );
  }, [cityCenter, providers, staticKey]);

  const useGoogle = Boolean(googleStaticUri) && !googleFailed;

  const tiles = useMemo(() => {
    const { x: cx, y: cy } = latLngToTile(
      cityCenter.latitude,
      cityCenter.longitude,
      ZOOM,
    );
    const list: { key: string; uri: string; col: number; row: number }[] = [];
    for (let row = -RADIUS; row <= RADIUS; row++) {
      for (let col = -RADIUS; col <= RADIUS; col++) {
        list.push({
          key: `${ZOOM}-${cx + col}-${cy + row}`,
          uri: osmTileUrl(ZOOM, cx + col, cy + row),
          col: col + RADIUS,
          row: row + RADIUS,
        });
      }
    }
    return list;
  }, [cityCenter]);

  const mapH = SCREEN_H;
  const mapW = SCREEN_W;
  const gridSize = (RADIUS * 2 + 1) * TILE;

  const pinPositions = useMemo(
    () =>
      providers.map((p) => {
        const c = coordsForProvider(p, cityCenter);
        const pos = projectToPixels(
          c.latitude,
          c.longitude,
          cityCenter.latitude,
          cityCenter.longitude,
          ZOOM,
          TILE,
          RADIUS,
          mapW,
          mapH,
        );
        return { provider: p, ...pos };
      }),
    [providers, cityCenter, mapW, mapH],
  );

  const selected = providers.find((p) => p.id === selectedId) ?? null;

  return (
    <View style={styles.root}>
      <View style={styles.mapHost}>
        {useGoogle ? (
          <Image
            key={googleStaticUri!}
            source={{ uri: googleStaticUri! }}
            style={styles.map}
            resizeMode="cover"
            onLoadStart={() => setGoogleLoading(true)}
            onLoad={() => setGoogleLoading(false)}
            onError={() => {
              setGoogleFailed(true);
              setGoogleLoading(false);
            }}
          />
        ) : (
          <View
            style={[
              styles.tileGrid,
              {
                width: gridSize,
                height: gridSize,
                left: (mapW - gridSize) / 2,
                top: (mapH - gridSize) / 2,
              },
            ]}
          >
            {tiles.map((t) => (
              <Image
                key={t.key}
                source={{ uri: t.uri }}
                style={{
                  position: 'absolute',
                  width: TILE,
                  height: TILE,
                  left: t.col * TILE,
                  top: t.row * TILE,
                }}
              />
            ))}
          </View>
        )}

        {!useGoogle
          ? pinPositions.map(({ provider, left, top }) => (
              <Pressable
                key={provider.id}
                style={[
                  styles.pin,
                  selectedId === provider.id && styles.pinSelected,
                  { left: left - 17, top: top - 34 },
                ]}
                onPress={() => setSelectedId(provider.id)}
              >
                <Ionicons name="home" size={14} color="#fff" />
              </Pressable>
            ))
          : null}

        {useGoogle && googleLoading ? (
          <View style={styles.mapLoading} pointerEvents="none">
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.mapLoadingText}>جاري تحميل الخريطة…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        {header}
        {loading ? (
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل المنشآت…</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.carouselWrap} pointerEvents="box-none">
        {selected ? (
          <Pressable
            style={styles.resultCard}
            onPress={() => onOpenProvider(selected.id)}
          >
            <FacilityCardBody provider={selected} formatPrice={formatPrice} />
          </Pressable>
        ) : providers.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>لا توجد منشآت في هذه المدينة</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={providers}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.resultCard}
                onPress={() => onOpenProvider(item.id)}
              >
                <FacilityCardBody provider={item} formatPrice={formatPrice} />
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

function FacilityCardBody({
  provider,
  formatPrice,
}: {
  provider: Provider;
  formatPrice: (n: number) => string;
}) {
  const service = cheapestService(provider);
  const price = service?.priceFrom ?? service?.basePrice;
  return (
    <>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {provider.businessName}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {[provider.cityName ?? provider.city?.name, provider.addressDetails]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <View style={styles.cardFooter}>
          {provider.categoryName || provider.category?.name ? (
            <Text style={styles.cardCat}>
              {provider.categoryName ?? provider.category?.name}
            </Text>
          ) : (
            <View />
          )}
          {price != null ? (
            <Text style={styles.cardPrice}>من {formatPrice(price)}</Text>
          ) : null}
        </View>
      </View>
      {provider.images?.[0] || provider.logoUrl ? (
        <Image
          source={{ uri: provider.images?.[0] ?? provider.logoUrl }}
          style={styles.cardImage}
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="business" size={22} color={theme.colors.primary} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#D6E0EF' },
  mapHost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#D6E0EF',
    overflow: 'hidden',
  },
  map: { width: SCREEN_W, height: SCREEN_H },
  tileGrid: { position: 'absolute' },
  pin: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    elevation: 5,
  },
  pinSelected: {
    backgroundColor: theme.colors.accentDark,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(214,224,239,0.85)',
  },
  mapLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
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
  carouselWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    paddingHorizontal: 14,
  },
  carouselContent: { paddingRight: 14 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary },
  resultCard: {
    width: SCREEN_W - 56,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECF3',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardBody: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  cardTitle: {
    width: '100%',
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  cardMeta: {
    width: '100%',
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  cardFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardCat: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.accentDark,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: theme.colors.mint,
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

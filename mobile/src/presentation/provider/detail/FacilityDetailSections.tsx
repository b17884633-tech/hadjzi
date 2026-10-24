import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { MapFallback } from '@/core/ui/components/MapFallback';
import { Ionicons } from '@expo/vector-icons';
import type { FacilityReview } from '../../../data/remote/reviewApi';
import { Provider } from '../../../domain/model/Provider';
import { visualForCategory } from '../../home/categoryIcons';
import { centerForCityName, coordsForProvider } from '../../search/mapGeo';
import { FacilityOfferBanner } from './FacilityOfferBanner';
import { RatingsSection } from './RatingsSection';
import { DETAIL, buildDetailModel } from './detailModel';

type Props = {
  provider: Provider;
  categoryHints?: Array<string | null | undefined>;
  reviews?: FacilityReview[];
  formatPrice: (n: number) => string;
  /** Hide product-level chips/amenities (already shown above on catalog product page). */
  hideProductExtras?: boolean;
};

function IconLine({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.iconLine}>
      <Ionicons name={icon} size={20} color={DETAIL.muted} />
      <Text style={styles.iconLineText}>{label}</Text>
    </View>
  );
}

/** Facility body matching ProviderProfileScreen sections (no packages / CTA). */
export function FacilityDetailSections({
  provider,
  categoryHints = [],
  reviews = [],
  formatPrice,
  hideProductExtras = false,
}: Props) {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);

  const detail = useMemo(
    () => buildDetailModel(provider, null, categoryHints),
    [provider, categoryHints],
  );

  const addressLine =
    provider.addressDetails?.trim() ||
    [provider.cityName ?? provider.city?.name, provider.regionName ?? provider.region?.name]
      .filter(Boolean)
      .join('، ');

  const hasReviews =
    (provider.reviewCount ?? 0) > 0 && provider.rating != null;
  const rating = hasReviews ? provider.rating! : 0;
  const ratingLabel = hasReviews ? rating.toFixed(1) : 'جديد';
  const catVisual = visualForCategory(detail.categoryLabel);
  const aboutPreview =
    detail.aboutText.length > 140 && !aboutExpanded
      ? `${detail.aboutText.slice(0, 140)}...`
      : detail.aboutText;
  const visibleAmenities = amenitiesExpanded
    ? detail.amenities
    : detail.amenities.slice(0, 4);

  const mapCoords = useMemo(() => {
    const city = provider.cityName ?? provider.city?.name;
    return coordsForProvider(provider, centerForCityName(city));
  }, [provider]);

  const openMaps = () => {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${mapCoords.latitude},${mapCoords.longitude}`,
    );
  };

  const openTour = () => {
    const url = detail.tourUrl?.trim();
    if (url) {
      Linking.openURL(url).catch(() => openMaps());
      return;
    }
    openMaps();
  };

  return (
    <View style={styles.wrap}>
      {!hideProductExtras ? (
        <View style={styles.metaRow}>
          <View style={styles.catRow}>
            <Ionicons name={catVisual.icon} size={16} color={DETAIL.navy} />
            <Text style={styles.catText}>{detail.categoryLabel}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{ratingLabel}</Text>
            <Ionicons name="star" size={15} color={DETAIL.gold} />
            {hasReviews ? (
              <Text style={styles.ratingCount}>({provider.reviewCount})</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <Text style={styles.title}>{provider.businessName}</Text>

      {provider.activeOffer ? (
        <FacilityOfferBanner offer={provider.activeOffer} />
      ) : null}

      {addressLine ? (
        <View style={styles.locRow}>
          <Ionicons name="location-sharp" size={14} color={DETAIL.muted} />
          <Text style={styles.locText}>{addressLine}</Text>
        </View>
      ) : null}

      {detail.show360 ? (
        <Pressable style={styles.primaryBtn} onPress={openTour}>
          <Text style={styles.primaryBtnText}>جولة 360°</Text>
          <Ionicons name="sync-outline" size={18} color="#fff" />
        </Pressable>
      ) : null}

      {!hideProductExtras && detail.showFeatureChips ? (
        <View style={styles.chipsRow}>
          {detail.featureChips.map((chip) => (
            <View key={chip.key} style={styles.chip}>
              <Ionicons name={chip.icon} size={22} color={DETAIL.muted} />
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{detail.aboutTitle}</Text>
      <Text style={styles.body}>{aboutPreview}</Text>
      {detail.aboutText.length > 140 ? (
        <Pressable onPress={() => setAboutExpanded((v) => !v)}>
          <Text style={styles.link}>
            {aboutExpanded ? 'عرض أقل' : 'عرض المزيد'}
          </Text>
        </Pressable>
      ) : null}

      {!hideProductExtras && detail.showSpaces ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>المساحات المتوفرة</Text>
          {detail.spaces.map((row) => (
            <IconLine key={row.key} icon={row.icon} label={row.label} />
          ))}
        </>
      ) : null}

      {!hideProductExtras && detail.showAmenities ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>وسائل الراحة</Text>
          {visibleAmenities.map((row) => (
            <IconLine key={row.key} icon={row.icon} label={row.label} />
          ))}
          {detail.amenities.length > 4 ? (
            <Pressable
              style={styles.outlinePill}
              onPress={() => setAmenitiesExpanded((v) => !v)}
            >
              <Text style={styles.outlinePillText}>
                {amenitiesExpanded
                  ? 'عرض أقل'
                  : `عرض جميع وسائل الراحة الـ ${detail.amenities.length}`}
              </Text>
              <Ionicons
                name={amenitiesExpanded ? 'chevron-down' : 'chevron-back'}
                size={16}
                color={DETAIL.muted}
              />
            </Pressable>
          ) : null}
        </>
      ) : null}

      {detail.showAddress ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>العنوان</Text>
          <View style={styles.locRowTight}>
            <Ionicons name="location-sharp" size={14} color={DETAIL.muted} />
            <Text style={styles.locText}>{addressLine || 'صنعاء'}</Text>
          </View>
          <View style={styles.mapCard}>
            <MapFallback
              latitude={mapCoords.latitude}
              longitude={mapCoords.longitude}
              height={180}
              label="فتح الموقع على الخريطة"
            />
          </View>
        </>
      ) : null}

      {detail.showRatingBanner ? (
        <>
          <View style={styles.divider} />
          <RatingsSection
            average={hasReviews ? rating : 0}
            count={provider.reviewCount ?? 0}
            reviews={reviews}
          />
        </>
      ) : null}

      {detail.depositNote?.trim() ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>العربون</Text>
          {detail.depositAmount != null && detail.depositAmount > 0 ? (
            <Text style={styles.priceAccent}>
              {formatPrice(detail.depositAmount)}
            </Text>
          ) : null}
          <Text style={styles.body}>{detail.depositNote}</Text>
        </>
      ) : null}

      {detail.showInsurance && detail.insuranceAmount != null ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>التأمين على الممتلكات</Text>
          <Text style={styles.priceAccent}>
            {formatPrice(detail.insuranceAmount)}
          </Text>
          {detail.insuranceMeta ? (
            <Text style={styles.bodyStrong}>{detail.insuranceMeta}</Text>
          ) : null}
          {detail.insuranceNote?.trim() ? (
            <Text style={styles.body}>{detail.insuranceNote}</Text>
          ) : null}
        </>
      ) : null}

      {detail.showTerms ? (
        <>
          <View style={styles.divider} />
          {detail.terms.map((t, i) => {
            const raw = t.trim();
            const labeled = /^\d+[\.\-\)]\s*/.test(raw)
              ? raw
              : `${i + 1}. ${raw}`;
            return (
              <Text key={`term-${i}`} style={styles.termLine}>
                {labeled}
              </Text>
            );
          })}
          {detail.policyBullets.map((t, i) => (
            <View key={`pol-${i}`} style={styles.bulletRow}>
              <View style={styles.diamond} />
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '700', color: DETAIL.text },
  ratingCount: { fontSize: 12, color: DETAIL.muted, marginLeft: 2 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontSize: 13, fontWeight: '700', color: DETAIL.navy },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: DETAIL.text,
    marginBottom: 8,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locRowTight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locText: {
    fontSize: 13,
    color: DETAIL.muted,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: DETAIL.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 4,
    paddingTop: 12,
  },
  chip: {
    width: 100,
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DETAIL.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: DETAIL.chipBg,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DETAIL.text,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DETAIL.line,
    marginVertical: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DETAIL.text,
    marginBottom: 12,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: DETAIL.muted,
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: DETAIL.text,
    marginBottom: 6,
    width: '100%',
    textAlign: 'right',
  },
  link: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: DETAIL.navy,
    textAlign: 'right',
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  iconLineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: DETAIL.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  outlinePill: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: DETAIL.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlinePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: DETAIL.muted,
  },
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DETAIL.border,
  },
  priceAccent: {
    fontSize: 20,
    fontWeight: '800',
    color: DETAIL.navy,
    marginBottom: 6,
    textAlign: 'right',
  },
  termLine: {
    fontSize: 14,
    lineHeight: 24,
    color: DETAIL.muted,
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: DETAIL.gold,
    transform: [{ rotate: '45deg' }],
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: DETAIL.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

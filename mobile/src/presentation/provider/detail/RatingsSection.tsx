import { useState } from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmoothBottomSheet } from '../../../core/ui/components/SmoothBottomSheet';
import { theme } from '../../../core/ui/theme';
import type { FacilityReview } from '../../../data/remote/reviewApi';
import { formatBookingDate } from '../../my_bookings/bookingUi';
import { DETAIL } from './detailModel';

const STAR_GOLD = DETAIL.gold;
const STAR_EMPTY = '#9A9B7A';

type Props = {
  average: number;
  count: number;
  reviews: FacilityReview[];
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ع';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

/** Supports half-star display for averages like 2.5; fills from the RTL start. */
export function StarsRow({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = clamped - (i - 1);
        const name =
          fill >= 0.75
            ? 'star'
            : fill >= 0.25
              ? 'star-half'
              : 'star-outline';
        const isHalf = name === 'star-half';
        return (
          <Ionicons
            key={i}
            name={name}
            size={size}
            color={fill >= 0.25 ? STAR_GOLD : STAR_EMPTY}
            style={
              isHalf && I18nManager.isRTL
                ? { transform: [{ scaleX: -1 }] }
                : undefined
            }
          />
        );
      })}
    </View>
  );
}

export function ReviewCard({
  review,
  wide,
}: {
  review: FacilityReview;
  wide?: boolean;
}) {
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <View style={styles.cardTop}>
        <View style={styles.badge}>
          <Ionicons name="star" size={12} color={STAR_GOLD} />
          <Text style={styles.badgeText}>{review.rating}/5</Text>
        </View>
        <View style={styles.userBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(review.customerName)}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName} numberOfLines={1}>
              {review.customerName}
            </Text>
            <Text style={styles.userDate}>
              {formatBookingDate(review.createdAt?.slice(0, 10))}
            </Text>
          </View>
        </View>
      </View>
      {review.comment?.trim() ? (
        <Text style={styles.comment} numberOfLines={wide ? undefined : 3}>
          {review.comment.trim()}
        </Text>
      ) : (
        <Text style={styles.commentMuted}>بدون تعليق</Text>
      )}
    </View>
  );
}

/**
 * Cream rating pill (all categories). Tap opens the reviews sheet.
 */
export function RatingsSection({ average, count, reviews }: Props) {
  const insets = useSafeAreaInsets();
  const [allOpen, setAllOpen] = useState(false);
  const hasReviews = count > 0;
  const scoreLabel = hasReviews ? average.toFixed(1) : '—';

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setAllOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="عرض التقييمات والتعليقات"
      >
        <LinearGradient
          colors={[DETAIL.ratingCardEnd, DETAIL.ratingCardStart, '#FFFDF6']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.summaryPill}
        >
          <View style={styles.summaryInner}>
            <StarsRow rating={hasReviews ? average : 0} size={22} />
            <Text style={styles.summaryScore}>{scoreLabel}</Text>
          </View>
        </LinearGradient>
      </Pressable>

      <SmoothBottomSheet
        visible={allOpen}
        onClose={() => setAllOpen(false)}
        sheetStyle={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.sheetHead}>
          <Pressable onPress={() => setAllOpen(false)} hitSlop={8}>
            <Text style={styles.sheetClose}>إغلاق</Text>
          </Pressable>
          <Text style={styles.sheetTitle}>كل التقييمات</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.sheetSummary}>
          <StarsRow rating={hasReviews ? average : 0} size={18} />
          <Text style={styles.sheetAvg}>
            {hasReviews
              ? `${scoreLabel} · ${count} تقييم`
              : 'لا توجد تقييمات بعد'}
          </Text>
        </View>
        <ScrollView
          style={styles.sheetList}
          contentContainerStyle={styles.sheetListContent}
          showsVerticalScrollIndicator={false}
        >
          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>لا توجد تعليقات بعد</Text>
            </View>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} wide />)
          )}
        </ScrollView>
      </SmoothBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 4,
  },
  summaryPill: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C5A368',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  summaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  summaryScore: {
    fontSize: 28,
    fontWeight: '800',
    color: DETAIL.text,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
  },
  cardWide: {
    width: '100%',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: STAR_GOLD,
  },
  userBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  userMeta: {
    flexShrink: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  userDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  comment: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text,
    textAlign: 'right',
  },
  commentMuted: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  emptyCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  sheetClose: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
  sheetSummary: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  sheetAvg: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sheetList: {
    flexGrow: 0,
  },
  sheetListContent: {
    gap: 10,
    paddingBottom: 8,
  },
});

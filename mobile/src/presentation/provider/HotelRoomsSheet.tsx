import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { SmoothBottomSheet } from '@/core/ui/components/SmoothBottomSheet';
import { ImageGalleryModal } from '@/core/ui/components/ImageGalleryModal';
import {
  CurrencyCode,
  formatServicePrice,
} from '../../core/common/currency';
import { guestsPerUnit } from '../booking/bookingFlow';
import { ServiceItem } from '../../../domain/model/Provider';
import { DETAIL } from './detail/detailModel';

type Props = {
  visible: boolean;
  onClose: () => void;
  rooms: ServiceItem[];
  fallbackImage?: string;
  currency: CurrencyCode;
  onReserve: (room: ServiceItem) => void;
};

function roomImages(room: ServiceItem, fallback?: string): string[] {
  const list = [
    ...(room.images?.filter(Boolean) ?? []),
    ...(room.imageUrl ? [room.imageUrl] : []),
  ];
  const unique = Array.from(new Set(list));
  if (unique.length) return unique;
  return fallback ? [fallback] : [];
}

export function HotelRoomsSheet({
  visible,
  onClose,
  rooms,
  fallbackImage,
  currency,
  onReserve,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ uris: string[]; index: number; title: string } | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      setGallery(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && rooms.some((r) => r.id === prev)) return prev;
      return rooms[0]?.id ?? null;
    });
  }, [visible, rooms]);

  const selected = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? null,
    [rooms, selectedId],
  );

  return (
    <>
      <SmoothBottomSheet visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>الغرف</Text>
          <Text style={styles.subtitle}>اختر الغرفة ثم اضغط متابعة الحجز</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {rooms.length === 0 ? (
            <Text style={styles.empty}>لا توجد غرف متاحة حالياً</Text>
          ) : (
            rooms.map((room) => {
              const priceLabel = formatServicePrice(
                room.attributes,
                room.priceFrom ?? room.basePrice,
                currency,
              );
              const images = roomImages(room, fallbackImage);
              const cover = images[0];
              const isSelected = room.id === selectedId;

              return (
                <Pressable
                  key={room.id}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => setSelectedId(room.id)}
                >
                  <View style={styles.cardBody}>
                    <Text style={styles.roomName} numberOfLines={1}>
                      {room.name}
                    </Text>
                    {room.description ? (
                      <Text style={styles.roomDesc} numberOfLines={2}>
                        {room.description}
                      </Text>
                    ) : null}
                    {(() => {
                      const cap = guestsPerUnit(room.attributes);
                      return cap != null ? (
                        <View style={styles.capRow}>
                          <Ionicons
                            name="people-outline"
                            size={13}
                            color={DETAIL.muted}
                          />
                          <Text style={styles.capText}>حتى {cap} أشخاص</Text>
                        </View>
                      ) : null;
                    })()}
                    {priceLabel ? (
                      <Text style={styles.price}>{priceLabel}</Text>
                    ) : (
                      <Text style={styles.priceMuted}>السعر عند الطلب</Text>
                    )}
                  </View>

                  <Pressable
                    style={styles.thumbWrap}
                    onPress={() => {
                      if (!images.length) {
                        setSelectedId(room.id);
                        return;
                      }
                      setGallery({ uris: images, index: 0, title: room.name });
                    }}
                  >
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <Ionicons name="bed-outline" size={22} color={DETAIL.navy} />
                      </View>
                    )}
                    {images.length > 1 ? (
                      <View style={styles.photoBadge}>
                        <Ionicons name="images-outline" size={10} color="#fff" />
                        <Text style={styles.photoBadgeText}>{images.length}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <Pressable
          style={[styles.reserveBtn, !selected && styles.reserveDisabled]}
          disabled={!selected}
          onPress={() => {
            if (selected) onReserve(selected);
          }}
        >
          <Text style={styles.reserveText}>متابعة الحجز</Text>
          <Ionicons name="book-outline" size={17} color="#fff" />
        </Pressable>
      </SmoothBottomSheet>

      <ImageGalleryModal
        visible={gallery != null}
        title={gallery?.title ?? ''}
        uris={gallery?.uris ?? []}
        initialIndex={gallery?.index ?? 0}
        onClose={() => setGallery(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: DETAIL.navy,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: DETAIL.muted,
    textAlign: 'center',
  },
  list: {
    gap: 10,
    paddingBottom: 12,
  },
  empty: {
    textAlign: 'center',
    color: DETAIL.muted,
    marginVertical: 24,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6ECF3',
    padding: 10,
    gap: 12,
  },
  cardSelected: {
    borderColor: DETAIL.navy,
    borderWidth: 1.5,
    backgroundColor: '#F7F9FC',
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8EEF8',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(13,27,62,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'center',
    gap: 4,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '800',
    color: DETAIL.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  roomDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: DETAIL.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  capText: {
    fontSize: 12,
    fontWeight: '700',
    color: DETAIL.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  price: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
    color: DETAIL.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  priceMuted: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: DETAIL.muted,
    textAlign: 'right',
  },
  reserveBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: DETAIL.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reserveDisabled: {
    opacity: 0.4,
  },
  reserveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});

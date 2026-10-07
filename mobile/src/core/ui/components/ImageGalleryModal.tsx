import { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  title?: string;
  uris: string[];
  initialIndex?: number;
  onClose: () => void;
};

/** Full-screen swipeable photo gallery. */
export function ImageGalleryModal({
  visible,
  title = '',
  uris,
  initialIndex = 0,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const safeIndex = Math.min(Math.max(0, initialIndex), Math.max(0, uris.length - 1));

  useEffect(() => {
    if (visible) setIndex(safeIndex);
  }, [visible, safeIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.close} onPress={onClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View style={styles.titleFlex} />
          )}
          <Text style={styles.counter}>
            {uris.length ? `${index + 1} / ${uris.length}` : ''}
          </Text>
        </View>

        {uris.length > 0 ? (
          <FlatList
            data={uris}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            initialScrollIndex={safeIndex}
            getItemLayout={(_, i) => ({
              length: SCREEN_W,
              offset: SCREEN_W * i,
              index: i,
            })}
            onMomentumScrollEnd={(e) => {
              setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
            }}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
              </View>
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  titleFlex: { flex: 1 },
  counter: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'left',
  },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H * 0.72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_W,
    height: '100%',
  },
});

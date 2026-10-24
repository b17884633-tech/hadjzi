import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../core/ui/theme';
import { useApp } from '../../di/AppProvider';

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  /** Smaller control for space rows. */
  size?: 'default' | 'small';
  showButton?: boolean;
  showThumbs?: boolean;
};

/** Compact camera button for attaching detail photos inline with steppers / space rows. */
export function CompactImageAttach({
  urls,
  onChange,
  max = 8,
  size = 'default',
  showButton = true,
  showThumbs = true,
}: Props) {
  const { container } = useApp();
  const [uploading, setUploading] = useState(false);
  const btn = size === 'small' ? 32 : 42;
  const thumb = size === 'small' ? 36 : 44;
  const icon = size === 'small' ? 16 : 18;

  const pick = async () => {
    if (urls.length >= max) {
      Alert.alert('حد الصور', `يمكنك إضافة حتى ${max} صور`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('الصلاحيات', 'يرجى السماح بالوصول إلى الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploading(true);
    try {
      const url = await container.uploadApi.uploadImage(
        result.assets[0].uri,
        result.assets[0].fileName ?? 'photo.jpg',
      );
      onChange([...urls, url]);
    } catch (e) {
      Alert.alert(
        'تعذر الرفع',
        e instanceof Error
          ? e.message
          : 'تأكد من إعداد Cloudinary على الخادم',
      );
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      {showButton ? (
        <Pressable
          style={[
            styles.btn,
            {
              width: btn,
              height: btn,
              borderRadius: size === 'small' ? 10 : 12,
            },
          ]}
          onPress={pick}
          disabled={uploading}
          hitSlop={6}
          accessibilityLabel="رفع صورة"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons
                name="camera-outline"
                size={icon}
                color={theme.colors.primary}
              />
              {urls.length > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{urls.length}</Text>
                </View>
              ) : null}
            </>
          )}
        </Pressable>
      ) : null}
      {showThumbs && urls.length > 0 ? (
        <View style={styles.thumbs}>
          {urls.map((uri, i) => (
            <View
              key={`${uri}-${i}`}
              style={[styles.thumbWrap, { width: thumb, height: thumb }]}
            >
              <Image
                source={{ uri }}
                style={{ width: thumb, height: thumb, borderRadius: 8 }}
              />
              <Pressable
                style={styles.remove}
                onPress={() => removeAt(i)}
                hitSlop={6}
              >
                <Ionicons name="close" size={10} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
  },
  btn: {
    backgroundColor: '#EEF2FA',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  thumbs: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  thumbWrap: {
    position: 'relative',
  },
  remove: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

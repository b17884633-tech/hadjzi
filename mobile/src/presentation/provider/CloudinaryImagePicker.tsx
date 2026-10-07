import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
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
  label?: string;
};

export function CloudinaryImagePicker({
  urls,
  onChange,
  max = 8,
  label = 'الصور',
}: Props) {
  const { container } = useApp();
  const [uploading, setUploading] = useState(false);

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
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>يمكنك رفع عدة صور للمنشأة</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {urls.map((uri, i) => (
          <View key={`${uri}-${i}`} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} />
            <Pressable style={styles.remove} onPress={() => removeAt(i)}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {urls.length < max ? (
          <Pressable style={styles.add} onPress={pick} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.addText}>رفع</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'right',
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingVertical: 4,
  },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
  },
  remove: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: '#EEF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBellButton } from '@/core/ui/components/NotificationBellButton';
import { theme } from '../../../core/ui/theme';

interface HomeHeaderProps {
  cityName: string;
  userName?: string | null;
  onCityPress: () => void;
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
}

export function HomeHeader({
  cityName,
  userName,
  onCityPress,
  onProfilePress,
  onNotificationsPress,
}: HomeHeaderProps) {
  const welcome = userName?.trim()
    ? `مرحباً ${userName.trim()}`
    : 'مرحباً بك في تطبيق حجزي';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onProfilePress} disabled={!onProfilePress}>
          <View style={styles.avatar}>
            <Image
              source={require('../../../../assets/logo.png')}
              style={styles.avatarImage}
            />
          </View>
        </Pressable>

        <View style={styles.textCol}>
          <Text style={styles.welcome} numberOfLines={1}>
            {welcome}
          </Text>
          <Pressable style={styles.cityBtn} onPress={onCityPress} hitSlop={8}>
            <Text style={styles.cityName}>{cityName}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.accentDark} />
          </Pressable>
        </View>

        {onNotificationsPress ? (
          <NotificationBellButton onPress={onNotificationsPress} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EEF8',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  textCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  welcome: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    maxWidth: '100%',
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accentDark,
  },
});

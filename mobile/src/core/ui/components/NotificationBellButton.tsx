import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '@/core/ui/theme';
import {
  subscribeNotifications,
  syncRemoteNotifications,
  unreadNotificationCount,
} from '@/data/local/notificationStorage';
import { useApp } from '@/di/AppProvider';

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function NotificationBellButton({ onPress, style }: Props) {
  const { user, container } = useApp();
  const [unread, setUnread] = useState(0);
  const apiRef = useRef(container.notificationApi);
  const userRef = useRef(user);
  apiRef.current = container.notificationApi;
  userRef.current = user;

  const refreshBadge = useCallback(() => {
    void unreadNotificationCount()
      .then(setUnread)
      .catch(() => setUnread(0));
  }, []);

  // Stable focus callback — only syncs once when the screen gains focus.
  // Refs avoid re-running this effect on every AppProvider re-render.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (userRef.current) {
          try {
            await syncRemoteNotifications(apiRef.current);
          } catch {
            /* offline / ignore */
          }
        }
        if (!cancelled) refreshBadge();
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshBadge]),
  );

  useEffect(() => {
    refreshBadge();
    return subscribeNotifications(refreshBadge);
  }, [refreshBadge]);

  const badgeLabel = unread > 99 ? '99+' : String(unread);

  return (
    <Pressable style={[styles.btn, style]} onPress={onPress} hitSlop={6}>
      <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
      {unread > 0 ? (
        <View style={[styles.badge, unread > 9 ? styles.badgeWide : null]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeWide: {
    minWidth: 20,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    includeFontPadding: false,
  },
});

import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '../../core/ui/theme';
import { CAIRO } from '../../core/ui/theme/fonts';

const ACTIVE = theme.colors.accent;
const INACTIVE = '#8A94A6';
const BAR_HEIGHT = 64;
const FAB_SIZE = 62;
const NOTCH_R = 40;
const TOP_CORNER = 22;
/** Empty space above the white bar for the FAB protrusion. */
const FAB_LIFT = FAB_SIZE * 0.34;
/** Extra offset so the logo circle sits a bit lower in the notch. */
const FAB_DROP = 12;

const ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  Home: { focused: 'home', idle: 'home-outline' },
  Explore: { focused: 'search', idle: 'search-outline' },
  MyBookings: { focused: 'calendar', idle: 'calendar-outline' },
  Account: { focused: 'person', idle: 'person-outline' },
};

function buildBarPath(width: number, height: number) {
  const mid = width / 2;
  const r = NOTCH_R;
  const c = TOP_CORNER;

  return [
    `M 0 ${c}`,
    `Q 0 0 ${c} 0`,
    `L ${mid - r - 18} 0`,
    `C ${mid - r - 4} 0 ${mid - r + 2} ${r * 0.12} ${mid - r + 8} ${r * 0.52}`,
    `C ${mid - r + 16} ${r * 0.92} ${mid - 14} ${r + 1} ${mid} ${r + 1}`,
    `C ${mid + 14} ${r + 1} ${mid + r - 16} ${r * 0.92} ${mid + r - 8} ${r * 0.52}`,
    `C ${mid + r - 2} ${r * 0.12} ${mid + r + 4} 0 ${mid + r + 18} 0`,
    `L ${width - c} 0`,
    `Q ${width} 0 ${width} ${c}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ');
}

/** White bar with rounded top corners + deep center U for the FAB. */
function TabBarShape({ width, height }: { width: number; height: number }) {
  const d = buildBarPath(width, height);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Path
        d={d}
        fill="#FFFFFF"
        // Soft lift matching the reference bar
        stroke="rgba(13, 27, 62, 0.06)"
        strokeWidth={1}
      />
    </Svg>
  );
}

type TabItem = {
  key: string;
  name: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
};

export function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);
  const whiteH = BAR_HEIGHT + bottomPad;
  const barWidth = screenW;
  const totalH = FAB_LIFT + whiteH;

  const items: TabItem[] = state.routes.map((route, index) => {
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options.title ?? route.name;

    return {
      key: route.key,
      name: route.name,
      label,
      focused,
      accessibilityLabel: options.tabBarAccessibilityLabel,
      onPress: () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      },
      onLongPress: () => {
        navigation.emit({ type: 'tabLongPress', target: route.key });
      },
    };
  });

  const leftPair = items.slice(0, 2);
  const rightPair = items.slice(2);

  const renderItem = (item: TabItem) => {
    const icons = ICONS[item.name] ?? { focused: 'ellipse', idle: 'ellipse-outline' };
    const color = item.focused ? ACTIVE : INACTIVE;
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityState={item.focused ? { selected: true } : {}}
        accessibilityLabel={item.accessibilityLabel}
        onPress={item.onPress}
        onLongPress={item.onLongPress}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Ionicons
          name={item.focused ? icons.focused : icons.idle}
          size={item.focused ? 24 : 22}
          color={color}
        />
        <Text
          style={[styles.label, { color, fontFamily: CAIRO.semiBold }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrapper, { width: barWidth, height: totalH }]} pointerEvents="box-none">
      {/* Notched white shape — transparent host so the U cutout stays open */}
      <View
        style={[styles.shapeHost, { top: FAB_LIFT, width: barWidth, height: whiteH }]}
        pointerEvents="none"
      >
        <TabBarShape width={barWidth} height={whiteH} />
      </View>

      {/* Tab icons + labels */}
      <View
        style={[
          styles.row,
          {
            top: FAB_LIFT,
            width: barWidth,
            height: BAR_HEIGHT,
          },
        ]}
      >
        <View style={styles.side}>{leftPair.map(renderItem)}</View>
        <View style={styles.fabSpacer} />
        <View style={styles.side}>{rightPair.map(renderItem)}</View>
      </View>

      {/* Center FAB — navy brand circle + logo */}
      <Pressable
        style={[
          styles.fab,
          {
            top: FAB_LIFT + NOTCH_R + 1 - FAB_SIZE + FAB_DROP,
            left: (barWidth - FAB_SIZE) / 2,
          },
        ]}
        onPress={() => navigation.navigate('Home', { screen: 'HomeMain' })}
        accessibilityRole="button"
        accessibilityLabel="حجزي"
      >
        <LinearGradient
          colors={[theme.colors.primaryLight, theme.colors.primary, theme.colors.heroNavy]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.fabGradient}
        >
          <View style={styles.fabLogoPlate}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.fabLogo}
            />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    alignItems: 'stretch',
  },
  shapeHost: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  row: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 10,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 0,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  fabSpacer: {
    width: FAB_SIZE + 18,
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    zIndex: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 10,
  },
  fabGradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  fabLogoPlate: {
    width: FAB_SIZE - 14,
    height: FAB_SIZE - 14,
    borderRadius: (FAB_SIZE - 14) / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fabLogo: {
    width: FAB_SIZE - 22,
    height: FAB_SIZE - 22,
    resizeMode: 'contain',
  },
});

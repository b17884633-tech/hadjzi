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
import Svg, { Path } from 'react-native-svg';
import { AppText as Text } from '@/core/ui/components/AppText';
import { theme } from '../../core/ui/theme';
import { CAIRO } from '../../core/ui/theme/fonts';

const ACTIVE = theme.colors.primary;
const INACTIVE = '#6B7280';
const BAR_HEIGHT = 66;
const FAB_SIZE = 64;
const NOTCH_R = 36;
const FAB_LIFT = 22;

const ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  Home: { focused: 'home', idle: 'home-outline' },
  Explore: { focused: 'search', idle: 'search-outline' },
  MyBookings: { focused: 'calendar', idle: 'calendar-outline' },
  Account: { focused: 'person', idle: 'person-outline' },
};

/** White bar + center notch; `height` includes bottom safe-area so no grey strip. */
function TabBarShape({ width, height }: { width: number; height: number }) {
  const mid = width / 2;
  const r = NOTCH_R;
  const d = [
    `M 0 0`,
    `L ${mid - r - 12} 0`,
    `C ${mid - r + 2} 0 ${mid - r + 8} ${r} ${mid} ${r}`,
    `C ${mid + r - 8} ${r} ${mid + r - 2} 0 ${mid + r + 12} 0`,
    `L ${width} 0`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Path d={d} fill="#FFFFFF" />
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

  // Always paint white under the icons through the home-indicator / nav area
  const bottomPad = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 16 : 8,
  );
  const whiteH = BAR_HEIGHT + bottomPad;
  const barWidth = screenW;

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
    <View style={[styles.wrapper, { width: barWidth }]} pointerEvents="box-none">
      {/* FAB sits in the lift zone above the white bar */}
      <View style={{ height: FAB_LIFT, width: barWidth }} pointerEvents="box-none">
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('Home', { screen: 'HomeMain' })}
          accessibilityRole="button"
          accessibilityLabel="حجزي"
        >
          <View style={styles.fabRing}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.fabLogo}
            />
          </View>
        </Pressable>
      </View>

      {/* Continuous white from icons through device bottom edge */}
      <View style={[styles.whiteBlock, { width: barWidth, height: whiteH }]}>
        <TabBarShape width={barWidth} height={whiteH} />
        <View style={[styles.row, { height: BAR_HEIGHT }]}>
          <View style={styles.side}>{leftPair.map(renderItem)}</View>
          <View style={styles.fabSpacer} />
          <View style={styles.side}>{rightPair.map(renderItem)}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    alignItems: 'stretch',
  },
  whiteBlock: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
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
    gap: 2,
    minWidth: 0,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  fabSpacer: {
    width: FAB_SIZE + 8,
  },
  fab: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    zIndex: 5,
  },
  fabRing: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1B3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  fabLogo: {
    width: FAB_SIZE - 8,
    height: FAB_SIZE - 8,
    resizeMode: 'contain',
  },
});

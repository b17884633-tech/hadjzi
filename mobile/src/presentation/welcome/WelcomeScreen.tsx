import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { AppText as Text } from '@/core/ui/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../core/ui/theme';
import { CAIRO } from '../../core/ui/theme/fonts';
import { setWelcomeCompleted } from '../../data/local/onboardingStorage';
import { useApp } from '../../di/AppProvider';
import { RootStackParamList } from '../navigation/types';
import {
  FACILITY_FALLBACK_IMAGES,
  WELCOME_SLIDES,
  shufflePick,
} from './welcomeContent';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const INTRO_MS = 2400;
const H_PAD = 24;
const COLLAGE_GAP = 10;
const TOP_TILE = (SCREEN_W - H_PAD * 2 - COLLAGE_GAP) / 2;

function isHttp(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export function WelcomeScreen({ navigation }: Props) {
  const { markWelcomeComplete, container } = useApp();
  const [phase, setPhase] = useState<'intro' | 'slides'>('intro');
  const [index, setIndex] = useState(0);
  const [heroImage, setHeroImage] = useState(FACILITY_FALLBACK_IMAGES[0]);
  const [slideImageSets, setSlideImageSets] = useState<string[][]>(() =>
    WELCOME_SLIDES.map((_, i) =>
      shufflePick(
        [
          ...FACILITY_FALLBACK_IMAGES.slice(i * 3),
          ...FACILITY_FALLBACK_IMAGES.slice(0, i * 3),
        ],
        3,
      ),
    ),
  );
  const introProgress = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(false);
  const imagesLockedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await container.searchRepository.search({});
        const urls = (res.providers ?? [])
          .flatMap((p) => {
            const fromProvider = p.images?.filter(isHttp) ?? [];
            if (fromProvider.length) return fromProvider;
            const fromServices =
              p.services?.flatMap((s) => s.images?.filter(isHttp) ?? []) ?? [];
            if (fromServices.length) return fromServices;
            return p.logoUrl && isHttp(p.logoUrl) ? [p.logoUrl] : [];
          })
          .filter((u, i, arr) => arr.indexOf(u) === i);
        if (cancelled || urls.length < 3 || imagesLockedRef.current) return;
        // Only swap in facility photos before the user leaves the intro.
        if (phase !== 'intro') return;
        imagesLockedRef.current = true;
        setHeroImage(urls[0]);
        setSlideImageSets(
          WELCOME_SLIDES.map((_, i) => {
            const rotated = [...urls.slice(i * 3), ...urls.slice(0, i * 3)];
            return shufflePick(rotated, 3);
          }),
        );
      } catch {
        /* keep fallbacks */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [container, phase]);

  useEffect(() => {
    if (phase !== 'intro') return;
    introProgress.setValue(0);
    const anim = Animated.timing(introProgress, {
      toValue: 1,
      duration: INTRO_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) {
        imagesLockedRef.current = true;
        setPhase('slides');
      }
    });
    return () => anim.stop();
  }, [phase, introProgress]);

  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await setWelcomeCompleted();
    markWelcomeComplete();
    navigation.replace('Main');
  };

  const goNext = () => {
    if (index >= WELCOME_SLIDES.length - 1) {
      void finish();
      return;
    }
    setIndex((i) => i + 1);
  };

  if (phase === 'intro') {
    return (
      <View style={styles.root}>
        <ImageBackground source={{ uri: heroImage }} style={styles.introBg} resizeMode="cover">
          <LinearGradient
            colors={['rgba(13,27,62,0.35)', 'rgba(13,27,62,0.55)', 'rgba(13,27,62,0.72)']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.introSafe} edges={['top', 'left', 'right', 'bottom']}>
            <Pressable style={styles.introCenter} onPress={() => setPhase('slides')}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.introLogo}
                resizeMode="contain"
              />
              <Text style={styles.introBrand}>حجزي</Text>
              <Text style={styles.introTagline}>
                اكتشف. احجز. استمتع.{'\n'}احجز بثقة مع حجزي
              </Text>
            </Pressable>
            <View style={styles.introBarTrack}>
              <Animated.View
                style={[
                  styles.introBarFill,
                  {
                    width: introProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  const slide = WELCOME_SLIDES[index];
  const images = slideImageSets[index] ?? FACILITY_FALLBACK_IMAGES.slice(0, 3);
  const isLast = index === WELCOME_SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.slideHeader}>
        <Pressable onPress={() => void finish()} hitSlop={10} style={styles.skipBtn}>
          <Text style={styles.skipText}>تخطّي</Text>
        </Pressable>
      </View>

      <View style={styles.slideBody}>
        <View style={styles.collage}>
          <View style={styles.collageTop}>
            <Image source={{ uri: images[0] }} style={styles.tileTop} resizeMode="cover" />
            <Image source={{ uri: images[1] }} style={styles.tileTop} resizeMode="cover" />
          </View>
          <Image source={{ uri: images[2] }} style={styles.tileWide} resizeMode="cover" />
          <View style={styles.floatingIcon}>
            <Ionicons name={slide.icon} size={22} color={theme.colors.primary} />
          </View>
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>
            <Text style={styles.titleLead}>{slide.titleLead} </Text>
            <Text style={styles.titleAccent}>{slide.titleAccent}</Text>
          </Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {WELCOME_SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextPressed]}
          onPress={goNext}
        >
          <Text style={styles.nextLabel}>{isLast ? 'ابدأ الآن' : 'التالي'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* —— Intro —— */
  introBg: {
    flex: 1,
    width: SCREEN_W,
    minHeight: SCREEN_H,
  },
  introSafe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  introCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  introLogo: {
    width: 112,
    height: 112,
  },
  introBrand: {
    fontFamily: CAIRO.bold,
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  introTagline: {
    fontFamily: CAIRO.medium,
    fontSize: 15,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  introBarTrack: {
    alignSelf: 'center',
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  introBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },

  /* —— Slides —— */
  slideHeader: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontFamily: CAIRO.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  slideBody: {
    flex: 1,
    paddingHorizontal: H_PAD,
  },
  collage: {
    direction: 'ltr',
    position: 'relative',
  },
  collageTop: {
    flexDirection: 'row',
    gap: COLLAGE_GAP,
  },
  tileTop: {
    width: TOP_TILE,
    height: TOP_TILE * 0.95,
    borderRadius: 22,
    backgroundColor: theme.colors.mint,
  },
  tileWide: {
    marginTop: COLLAGE_GAP,
    width: '100%',
    height: TOP_TILE * 0.72,
    borderRadius: 22,
    backgroundColor: theme.colors.mint,
  },
  floatingIcon: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1B3E',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  copyBlock: {
    marginTop: 28,
    gap: 10,
    width: '100%',
  },
  title: {
    fontFamily: CAIRO.bold,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 42,
    width: '100%',
  },
  titleLead: {
    color: theme.colors.primary,
  },
  titleAccent: {
    color: theme.colors.accent,
  },
  description: {
    fontFamily: CAIRO.regular,
    fontSize: 15,
    lineHeight: 26,
    color: theme.colors.textSecondary,
    width: '100%',
  },
  footer: {
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: theme.colors.accent,
  },
  dotIdle: {
    width: 16,
    backgroundColor: '#E5EAF1',
  },
  nextBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPressed: {
    opacity: 0.9,
  },
  nextLabel: {
    fontFamily: CAIRO.bold,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

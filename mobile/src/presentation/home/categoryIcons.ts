import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../core/ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export type CategoryVisual = {
  icon: IconName;
  bg: string;
  fg: string;
};

const GOLD_BG = '#F6EEDC';
const GOLD_FG = theme.colors.accentDark;

/** Most-specific rules first so children get unique icons. */
const RULES: Array<{ match: RegExp; icon: IconName }> = [
  // Roots (5.1–5.13)
  { match: /^الصالات$/i, icon: 'business' },
  { match: /^الشاليهات$/i, icon: 'sunny' },
  { match: /^الفنادق$/i, icon: 'bed' },
  { match: /^الطيرمانات$/i, icon: 'home' },
  { match: /^صحة$/i, icon: 'medkit' },
  { match: /^مستلزمات الأعراس$/i, icon: 'gift' },
  { match: /^كوافير$/i, icon: 'cut' },
  { match: /^المسابح والنوادي$/i, icon: 'water' },
  { match: /^الملاعب$/i, icon: 'basketball' },
  { match: /^النقليات$/i, icon: 'bus' },
  { match: /^السيارات$/i, icon: 'car' },
  { match: /^الزفافين والفنانين$/i, icon: 'musical-notes' },
  { match: /^جلسات التصوير$/i, icon: 'camera' },

  // Health subs
  { match: /^عيادات$/i, icon: 'medkit' },
  { match: /^مستشفيات$/i, icon: 'fitness' },
  { match: /^مراكز طبية$/i, icon: 'pulse' },
  { match: /^مراكز الأشعة$/i, icon: 'scan' },
  { match: /^العلاج الطبيعي$/i, icon: 'body' },
  { match: /^الغرف$/i, icon: 'key' },

  // Wedding supplies
  { match: /^الماء$/i, icon: 'water' },
  { match: /^الزينة$/i, icon: 'color-palette' },
  { match: /^الوجبات$/i, icon: 'restaurant' },
  { match: /^الكوش$/i, icon: 'flower' },
  { match: /^الحلويات$/i, icon: 'ice-cream' },
  { match: /^الكيك/i, icon: 'cafe' },
  { match: /^الهدايا$/i, icon: 'gift' },
  { match: /^الباقات|الفل/i, icon: 'flower' },
  { match: /^الثلاجات$/i, icon: 'cube' },
  { match: /^خيام$/i, icon: 'flag' },
  { match: /^طباخين$/i, icon: 'flame' },

  // Gender / salon / artists
  { match: /^قسم النساء$/i, icon: 'female' },
  { match: /^قسم الرجال$/i, icon: 'male' },
  { match: /^الكوافير$/i, icon: 'cut' },
  { match: /^جلسات التجميل$/i, icon: 'sparkles' },
  { match: /^الحلاقين$/i, icon: 'cut' },
  { match: /^مغني/i, icon: 'mic' },
  { match: /^زفاف/i, icon: 'walk' },
  { match: /^فرق$/i, icon: 'people' },
  { match: /^مبرع/i, icon: 'ribbon' },
  { match: /^رقاص/i, icon: 'musical-notes' },

  // Pools / clubs / sports
  { match: /^المسابح$/i, icon: 'water' },
  { match: /^النوادي/i, icon: 'fitness' },
  { match: /^كرة قدم$/i, icon: 'football' },
  { match: /^بادل$/i, icon: 'tennisball' },

  // Fallbacks
  { match: /صالة|قاعة|أفراح|hall/i, icon: 'business' },
  { match: /شالي|chalet/i, icon: 'sunny' },
  { match: /فندق|hotel/i, icon: 'bed' },
  { match: /طيرمان|شقق|apartment/i, icon: 'home' },
  { match: /صح|عياد|طبي|clinic|hospital/i, icon: 'medkit' },
  { match: /عرس|زفاف|wedding/i, icon: 'gift' },
  { match: /كوافير|حلاق|تجميل|salon|barber/i, icon: 'cut' },
  { match: /مسبح|نادي|pool|gym/i, icon: 'water' },
  { match: /ملعب|رياض|field|sport/i, icon: 'basketball' },
  { match: /نقل|transport/i, icon: 'bus' },
  { match: /سيارات|car|rent/i, icon: 'car' },
  { match: /فنان|مغن|زفة|artist/i, icon: 'musical-notes' },
  { match: /تصوير|camera|photo/i, icon: 'camera' },
];

const FALLBACK_ICON: IconName = 'grid';

export function visualForCategory(name: string): CategoryVisual {
  for (const rule of RULES) {
    if (rule.match.test(name)) {
      return { icon: rule.icon, bg: GOLD_BG, fg: GOLD_FG };
    }
  }
  return { icon: FALLBACK_ICON, bg: GOLD_BG, fg: GOLD_FG };
}

export function iconForCategory(name: string): IconName {
  return visualForCategory(name).icon;
}

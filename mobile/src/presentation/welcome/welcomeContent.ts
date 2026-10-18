import { Ionicons } from '@expo/vector-icons';

/** Facility-style fallbacks when the API has no images yet. */
export const FACILITY_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=800&q=80',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
];

export type WelcomeSlide = {
  id: string;
  /** First line / lead words (navy) */
  titleLead: string;
  /** Accent words (gold) */
  titleAccent: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'discover',
    titleLead: 'اكتشف',
    titleAccent: 'منشآت مميزة',
    description:
      'قاعات، شاليهات، فنادق وخدمات مختارة بعناية لأفضل تجربة حجز في اليمن.',
    icon: 'business-outline',
  },
  {
    id: 'book',
    titleLead: 'احجز',
    titleAccent: 'بسهولة وأمان',
    description:
      'احجز خلال دقائق، تابع طلبك لحظة بلحظة، وادفع بمرونة دون تعقيد.',
    icon: 'calendar-outline',
  },
  {
    id: 'find',
    titleLead: 'اعثر على',
    titleAccent: 'أماكن جديدة',
    description:
      'استكشف وجهات وعروضاً قريبة منك — حجزي يغطي احتياجك من البداية للنهاية.',
    icon: 'location-outline',
  },
];

export function shufflePick<T>(items: T[], count: number): T[] {
  if (items.length === 0) return [];
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (copy.length >= count) return copy.slice(0, count);
  const out: T[] = [];
  while (out.length < count) {
    out.push(copy[out.length % copy.length]);
  }
  return out;
}

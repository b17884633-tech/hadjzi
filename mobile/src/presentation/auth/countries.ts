export type Country = {
  code: string;
  dialCode: string;
  nameAr: string;
  flag: string;
};

/** Curated list — Yemen pinned first for Hadjzi */
export const COUNTRIES: Country[] = [
  { code: 'YE', dialCode: '+967', nameAr: 'اليمن', flag: '🇾🇪' },
  { code: 'SA', dialCode: '+966', nameAr: 'السعودية', flag: '🇸🇦' },
  { code: 'AE', dialCode: '+971', nameAr: 'الإمارات', flag: '🇦🇪' },
  { code: 'OM', dialCode: '+968', nameAr: 'عُمان', flag: '🇴🇲' },
  { code: 'QA', dialCode: '+974', nameAr: 'قطر', flag: '🇶🇦' },
  { code: 'KW', dialCode: '+965', nameAr: 'الكويت', flag: '🇰🇼' },
  { code: 'BH', dialCode: '+973', nameAr: 'البحرين', flag: '🇧🇭' },
  { code: 'EG', dialCode: '+20', nameAr: 'مصر', flag: '🇪🇬' },
  { code: 'JO', dialCode: '+962', nameAr: 'الأردن', flag: '🇯🇴' },
  { code: 'IQ', dialCode: '+964', nameAr: 'العراق', flag: '🇮🇶' },
  { code: 'SY', dialCode: '+963', nameAr: 'سوريا', flag: '🇸🇾' },
  { code: 'LB', dialCode: '+961', nameAr: 'لبنان', flag: '🇱🇧' },
  { code: 'PS', dialCode: '+970', nameAr: 'فلسطين', flag: '🇵🇸' },
  { code: 'MA', dialCode: '+212', nameAr: 'المغرب', flag: '🇲🇦' },
  { code: 'DZ', dialCode: '+213', nameAr: 'الجزائر', flag: '🇩🇿' },
  { code: 'TN', dialCode: '+216', nameAr: 'تونس', flag: '🇹🇳' },
  { code: 'LY', dialCode: '+218', nameAr: 'ليبيا', flag: '🇱🇾' },
  { code: 'SD', dialCode: '+249', nameAr: 'السودان', flag: '🇸🇩' },
  { code: 'TR', dialCode: '+90', nameAr: 'تركيا', flag: '🇹🇷' },
  { code: 'US', dialCode: '+1', nameAr: 'الولايات المتحدة', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', nameAr: 'المملكة المتحدة', flag: '🇬🇧' },
  { code: 'DE', dialCode: '+49', nameAr: 'ألمانيا', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', nameAr: 'فرنسا', flag: '🇫🇷' },
  { code: 'AF', dialCode: '+93', nameAr: 'أفغانستان', flag: '🇦🇫' },
  { code: 'AL', dialCode: '+355', nameAr: 'ألبانيا', flag: '🇦🇱' },
  { code: 'AO', dialCode: '+244', nameAr: 'أنغولا', flag: '🇦🇴' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function buildE164(dialCode: string, national: string): string {
  const digits = national.replace(/\D/g, '').replace(/^0+/, '');
  return `${dialCode}${digits}`;
}

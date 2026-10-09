/** Named hourly price bands for sports / playgrounds (ملعب، بادل…). */

export type PricePeriod = {
  id: string;
  label: string;
  /** HH:mm */
  fromTime: string;
  /** HH:mm — exclusive end for matching hours */
  toTime: string;
  /** NEW_YER per hour */
  pricePerHour: number;
};

const ORDINAL_AR = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];

export function defaultSportPricePeriods(basePrice = 5000): PricePeriod[] {
  const p = Math.max(0, Math.round(basePrice));
  return [
    {
      id: 'p1',
      label: 'الفترة الأولى',
      fromTime: '08:00',
      toTime: '12:00',
      pricePerHour: p,
    },
    {
      id: 'p2',
      label: 'الفترة الثانية',
      fromTime: '15:00',
      toTime: '18:00',
      pricePerHour: p,
    },
    {
      id: 'p3',
      label: 'الفترة الثالثة',
      fromTime: '18:00',
      toTime: '20:00',
      pricePerHour: Math.round(p * 1.2),
    },
  ];
}

export function periodLabelForIndex(index: number): string {
  const ord = ORDINAL_AR[index] ?? `${index + 1}`;
  return `الفترة ${ord}`;
}

export function timeToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(raw).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/** Whether an hour slot starting at `startTime` falls inside the period window. */
export function slotInPeriod(
  period: PricePeriod,
  startTime?: string | null,
): boolean {
  const t = timeToMinutes(startTime);
  const from = timeToMinutes(period.fromTime);
  const to = timeToMinutes(period.toTime);
  if (t == null || from == null || to == null) return false;
  if (to === from) return true;
  if (to > from) return t >= from && t < to;
  // Overnight wrap e.g. 22:00 → 02:00
  return t >= from || t < to;
}

export function findPeriodForSlot(
  periods: PricePeriod[],
  startTime?: string | null,
): PricePeriod | undefined {
  return periods.find((p) => slotInPeriod(p, startTime));
}

/** True when the slot start falls inside any configured price period. */
export function slotInAnyPeriod(
  periods: PricePeriod[],
  startTime?: string | null,
): boolean {
  if (!periods.length) return true;
  return findPeriodForSlot(periods, startTime) != null;
}

/**
 * Hour starts (0–23) covered by the periods — used when seeding bookable slots.
 * End time is exclusive (e.g. 18:00–20:00 → hours 18, 19).
 */
export function hoursCoveredByPeriods(periods: PricePeriod[]): number[] {
  if (!periods.length) return [];
  const set = new Set<number>();
  for (let h = 0; h < 24; h++) {
    const start = `${String(h).padStart(2, '0')}:00`;
    if (findPeriodForSlot(periods, start)) set.add(h);
  }
  return [...set].sort((a, b) => a - b);
}

export function priceForSlotHour(
  periods: PricePeriod[],
  startTime: string | null | undefined,
  fallback: number,
): number {
  const hit = findPeriodForSlot(periods, startTime);
  if (hit && Number.isFinite(hit.pricePerHour)) return hit.pricePerHour;
  return fallback;
}

export function parsePricePeriods(raw: unknown): PricePeriod[] {
  if (!Array.isArray(raw)) return [];
  const out: PricePeriod[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const fromTime =
      typeof o.fromTime === 'string' ? o.fromTime.slice(0, 5) : '';
    const toTime = typeof o.toTime === 'string' ? o.toTime.slice(0, 5) : '';
    const price = Number(o.pricePerHour ?? o.price);
    if (!fromTime || !toTime || !Number.isFinite(price) || price < 0) continue;
    out.push({
      id: typeof o.id === 'string' && o.id ? o.id : `p${i + 1}`,
      label:
        typeof o.label === 'string' && o.label.trim()
          ? o.label.trim()
          : periodLabelForIndex(i),
      fromTime,
      toTime,
      pricePerHour: Math.round(price),
    });
  }
  return out;
}

export function formatPeriodClock(raw: string): string {
  const [hStr, mStr] = String(raw).slice(0, 5).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h)) return String(raw).slice(0, 5);
  const period = h < 12 ? 'ص' : 'م';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mins =
    Number.isFinite(m) && m > 0 ? `:${String(m).padStart(2, '0')}` : ':00';
  return `${hour12}${mins} ${period}`;
}

export function formatPeriodRange(from: string, to: string): string {
  return `${formatPeriodClock(from)} - ${formatPeriodClock(to)}`;
}

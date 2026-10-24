import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceItem } from './entities/service-item.entity';
import { ServiceAvailability } from './entities/service-availability.entity';
import { CarBrand } from './entities/car-brand.entity';
import {
  CreateAvailabilityDto,
  CreateServiceDto,
  SeedAvailabilityDto,
  SeedHourlyAvailabilityDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { ProvidersService } from '../providers/providers.service';
import {
  AvailabilityStatus,
  BookingType,
  RecordStatus,
} from '../../common/enums';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { DEFAULT_DEPOSIT_PERCENTAGE } from '../../common/constants/booking.constants';
import { TtlCache } from '../../common/utils/ttl-cache';

function normalizeBrandName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  return name.length ? name : null;
}

function toIsoDateOnly(d: Date): string {
  // Local calendar day — avoids seeding “yesterday” in UTC+ timezones.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Normalize pg date / Date / string into YYYY-MM-DD (noon-shift avoids TZ off-by-one). */
function dateKey(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}/.test(s) && !s.includes('T')) return s.slice(0, 10);
  }
  const d = v instanceof Date ? v : new Date(String(v));
  if (!Number.isNaN(d.getTime())) {
    return new Date(d.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  return String(v).slice(0, 10);
}

function addDaysToIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDateOnly(d);
}

function timeToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(raw).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function hourInPricePeriods(
  hour: number,
  periods: unknown,
): boolean {
  if (!Array.isArray(periods) || !periods.length) return false;
  const t = hour * 60;
  for (const raw of periods) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const from = timeToMinutes(
      typeof p.fromTime === 'string' ? p.fromTime : null,
    );
    const to = timeToMinutes(typeof p.toTime === 'string' ? p.toTime : null);
    if (from == null || to == null) continue;
    const inBand = to > from ? t >= from && t < to : t >= from || t < to;
    if (inBand) return true;
  }
  return false;
}

/** Prefer explicit hours → pricePeriods on the service → startHour..endHour. */
function resolveSeedHours(
  dto: SeedHourlyAvailabilityDto,
  attributes: Record<string, unknown> | null | undefined,
): number[] {
  if (Array.isArray(dto.hours) && dto.hours.length) {
    return [
      ...new Set(
        dto.hours
          .map((h) => Math.floor(Number(h)))
          .filter((h) => Number.isFinite(h) && h >= 0 && h <= 23),
      ),
    ].sort((a, b) => a - b);
  }

  const periods = (attributes ?? {}).pricePeriods;
  if (Array.isArray(periods) && periods.length) {
    const covered: number[] = [];
    for (let h = 0; h < 24; h++) {
      if (hourInPricePeriods(h, periods)) covered.push(h);
    }
    if (covered.length) return covered;
  }

  const startHour = dto.startHour ?? 8;
  const endHour = dto.endHour ?? 22;
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) hours.push(h);
  return hours;
}

@Injectable()
export class ServicesService {
  private readonly brandsCache = new TtlCache<CarBrand[]>(120_000);
  /** Legacy brands living only in product attributes are folded in once per process. */
  private brandsBackfilled = false;

  constructor(
    @InjectRepository(ServiceItem)
    private readonly services: Repository<ServiceItem>,
    @InjectRepository(ServiceAvailability)
    private readonly availabilities: Repository<ServiceAvailability>,
    @InjectRepository(CarBrand)
    private readonly carBrands: Repository<CarBrand>,
    @InjectRepository(PlatformSetting)
    private readonly settings: Repository<PlatformSetting>,
    private readonly providers: ProvidersService,
  ) {}

  /**
   * All known brands: shared catalog + any brand still only on product attributes.
   * Syncs missing attribute brands into car_brands so the list stays complete.
   */
  async listCarBrands() {
    const cached = this.brandsCache.get();
    if (cached) return cached;

    if (!this.brandsBackfilled) {
      // New brands are synced on every product write (syncBrandFromAttributes),
      // so this scan only has to catch rows created before that existed.
      const rows = await this.services
        .createQueryBuilder('s')
        .select(`DISTINCT trim(s.attributes->>'brand')`, 'brand')
        .where(`s.attributes ? 'brand'`)
        .andWhere(`nullif(trim(s.attributes->>'brand'), '') IS NOT NULL`)
        .getRawMany<{ brand: string }>();
      for (const row of rows) {
        await this.ensureCarBrand(row.brand);
      }
      this.brandsBackfilled = true;
    }

    return this.brandsCache.set(
      await this.carBrands.find({ order: { name: 'ASC' } }),
    );
  }

  /** Persist a brand so other providers can pick it later. Idempotent by name_key. */
  async ensureCarBrand(rawName: string) {
    const name = normalizeBrandName(rawName);
    if (!name) return null;
    const nameKey = name.toLowerCase();
    const existing = await this.carBrands.findOne({ where: { nameKey } });
    if (existing) return existing;
    try {
      const saved = await this.carBrands.save(
        this.carBrands.create({ name, nameKey }),
      );
      this.brandsCache.clear();
      return saved;
    } catch {
      return this.carBrands.findOne({ where: { nameKey } });
    }
  }

  private async syncBrandFromAttributes(
    attributes: Record<string, unknown> | null | undefined,
  ) {
    const brand = normalizeBrandName(attributes?.brand);
    if (brand) await this.ensureCarBrand(brand);
  }

  async create(userId: string, dto: CreateServiceDto) {
    const provider = await this.providers.assertOwned(userId, dto.providerId);
    const depositPercentage =
      dto.depositPercentage ?? (await this.defaultDepositPercentage());
    const attributes = dto.attributes ?? {};
    await this.syncBrandFromAttributes(attributes);
    const item = this.services.create({
      providerId: provider.id,
      categoryId: dto.categoryId ?? provider.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      depositPercentage,
      durationMinutes: dto.durationMinutes ?? null,
      attributes,
      images: dto.images ?? [],
    });
    return this.services.save(item);
  }

  private async defaultDepositPercentage() {
    const row = await this.settings.findOneBy({
      key: 'default_deposit_percentage',
    });
    const raw = row?.value;
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num) ? num : DEFAULT_DEPOSIT_PERCENTAGE;
  }

  async listMine(userId: string, providerId?: string) {
    if (providerId) {
      await this.providers.assertOwned(userId, providerId);
      return this.services.find({
        where: { providerId, status: RecordStatus.ACTIVE },
        relations: ['availabilities', 'category'],
        order: { createdAt: 'DESC' },
      });
    }
    const facilities = await this.providers.listMine(userId);
    if (!facilities.length) return [];
    const ids = facilities.map((p) => p.id);
    return this.services
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.availabilities', 'availabilities')
      .leftJoinAndSelect('s.category', 'category')
      .where('s.provider_id IN (:...ids)', { ids })
      .andWhere('s.status = :status', { status: RecordStatus.ACTIVE })
      .orderBy('s.created_at', 'DESC')
      .getMany();
  }

  /**
   * Public product page: service + taxonomy, plus only the calendar rows that
   * are still bookable (yesterday onward, in app TZ). Past rows accumulate
   * forever and must not be shipped to every client that opens the page.
   */
  private async loadPublicService(id: string): Promise<ServiceItem | null> {
    const item = await this.services.findOne({
      where: { id, status: RecordStatus.ACTIVE },
      relations: [
        'provider',
        'provider.category',
        'provider.category.parent',
        'category',
        'category.parent',
      ],
    });
    if (!item) return null;
    const from = addDaysToIso(toIsoDateOnly(new Date()), -1);
    item.availabilities = await this.availabilities
      .createQueryBuilder('a')
      .where('a.service_id = :serviceId', { serviceId: id })
      .andWhere('a.date >= :from', { from })
      .orderBy('a.date', 'ASC')
      .addOrderBy('a.start_time', 'ASC', 'NULLS FIRST')
      .getMany();
    return item;
  }

  async findPublic(id: string) {
    let item = await this.loadPublicService(id);
    if (!item) {
      throw new NotFoundException('Service not found');
    }

    // Day packages (halls / artists / photographers): ensure all-day calendar rows.
    // Sports packages: ensure bookable hourly slots for price windows.
    const bookingType =
      item.category?.bookingType ?? item.provider?.category?.bookingType;
    const catName = [
      item.category?.name,
      item.category?.parent?.name,
      item.provider?.category?.name,
      item.provider?.category?.parent?.name,
    ]
      .filter(Boolean)
      .join(' ');
    const isPhotoLike = /تصوير|camera|photo/i.test(catName);
    const attrs = (item.attributes ?? {}) as Record<string, unknown>;
    const hasPricePeriods =
      Array.isArray(attrs.pricePeriods) && attrs.pricePeriods.length > 0;
    let healed = false;
    if (
      isPhotoLike ||
      bookingType === BookingType.EVENT_DAY ||
      bookingType === BookingType.UNIT_DAY ||
      bookingType === BookingType.QUANTITY
    ) {
      healed = await this.ensureAllDaySlotsForService(item);
    } else if (hasPricePeriods) {
      healed = await this.ensureHourlySlotsForService(item);
    }
    if (healed) {
      item = await this.loadPublicService(id);
      if (!item) {
        throw new NotFoundException('Service not found');
      }
    }

    // Always expose calendar dates as YYYY-MM-DD strings.
    for (const row of item.availabilities ?? []) {
      row.date = dateKey(row.date);
    }
    return item;
  }

  /** Insert missing all-day rows for day-based bookings (no-op if enough exist). */
  private async ensureAllDaySlotsForService(
    service: ServiceItem,
  ): Promise<boolean> {
    const attrs = (service.attributes ?? {}) as Record<string, unknown>;
    // Hourly packages (sports, tairaman HOURLY, etc.) — never treat as all-day.
    if (
      attrs.pricingMode === 'HOURLY' ||
      (Array.isArray(attrs.pricePeriods) && attrs.pricePeriods.length > 0)
    ) {
      return this.ensureHourlySlotsForService(service);
    }

    const today = toIsoDateOnly(new Date());
    const futureAllDay = (service.availabilities ?? []).filter((a) => {
      const d = dateKey(a.date);
      return (
        !a.startTime &&
        d >= today &&
        (a.availableCapacity ?? 0) > 0 &&
        a.status !== AvailabilityStatus.BLOCKED &&
        a.status !== AvailabilityStatus.SOLD_OUT
      );
    }).length;
    if (futureAllDay >= 14) return false;

    const days = 90;
    const totalCapacity = Math.max(
      1,
      typeof attrs.inventory === 'number'
        ? attrs.inventory
        : typeof attrs.units === 'number'
          ? attrs.units
          : 1,
    );
    const start = parseIsoDate(today);
    const toExclusive = toIsoDateOnly(
      new Date(start.getTime() + days * 24 * 60 * 60 * 1000),
    );

    // Re-open zero-capacity / sold-out all-day rows so the calendar is usable.
    const restored = await this.availabilities
      .createQueryBuilder()
      .update(ServiceAvailability)
      .set({
        availableCapacity: () => 'GREATEST(total_capacity, 1)',
        status: AvailabilityStatus.AVAILABLE,
      })
      .where('service_id = :serviceId', { serviceId: service.id })
      .andWhere('start_time IS NULL')
      .andWhere('date >= :from', { from: today })
      .andWhere('date < :to', { to: toExclusive })
      .andWhere(
        '(available_capacity <= 0 OR status IN (:...bad))',
        {
          bad: [AvailabilityStatus.SOLD_OUT, AvailabilityStatus.BLOCKED],
        },
      )
      .execute();

    const existing = await this.availabilities
      .createQueryBuilder('a')
      .select('a.date', 'date')
      .where('a.service_id = :serviceId', { serviceId: service.id })
      .andWhere('a.start_time IS NULL')
      .andWhere('a.date >= :from', { from: today })
      .andWhere('a.date < :to', { to: toExclusive })
      .getRawMany<{ date: unknown }>();

    const have = new Set(existing.map((r) => dateKey(r.date)));
    const missing: string[] = [];
    for (let i = 0; i < days; i++) {
      const iso = toIsoDateOnly(
        new Date(start.getTime() + i * 24 * 60 * 60 * 1000),
      );
      if (!have.has(iso)) missing.push(iso);
    }

    let inserted = 0;
    if (missing.length) {
      await this.availabilities.query(
        `
        INSERT INTO service_availabilities (
          service_id, date, start_time, end_time,
          total_capacity, available_capacity, status
        )
        SELECT
          $1::uuid,
          d::date,
          NULL,
          NULL,
          $2::int,
          $2::int,
          'AVAILABLE'::availability_status
        FROM unnest($3::text[]) AS d
        ON CONFLICT (service_id, date) WHERE (start_time IS NULL)
        DO NOTHING
        `,
        [service.id, totalCapacity, missing],
      );
      inserted = missing.length;
    }

    return inserted > 0 || (restored.affected ?? 0) > 0;
  }

  /** Insert missing hourly rows from attributes.pricePeriods (no-op if none). */
  private async ensureHourlySlotsForService(service: ServiceItem): Promise<boolean> {
    const attrs = (service.attributes ?? {}) as Record<string, unknown>;
    const hasHourlyAttrs =
      attrs.pricingMode === 'HOURLY' ||
      (Array.isArray(attrs.pricePeriods) && attrs.pricePeriods.length > 0);
    // Day packages without hourly attrs must never receive hourly slot spam.
    const bookingType = service.category?.bookingType;
    if (
      !hasHourlyAttrs &&
      (bookingType === BookingType.EVENT_DAY ||
        bookingType === BookingType.UNIT_DAY ||
        bookingType === BookingType.QUANTITY)
    ) {
      return false;
    }
    const periods = attrs.pricePeriods;
    if (!Array.isArray(periods) || periods.length === 0) return false;

    const hours = resolveSeedHours({}, attrs);
    if (!hours.length) return false;

    const totalCapacity = Math.max(
      1,
      typeof attrs.inventory === 'number'
        ? attrs.inventory
        : typeof attrs.units === 'number'
          ? attrs.units
          : 1,
    );

    const today = toIsoDateOnly(new Date());
    const futureTimed = (service.availabilities ?? []).filter((a) => {
      const d = dateKey(a.date);
      return !!a.startTime && d >= today;
    }).length;
    // Need several days × hours to feel bookable in the strip.
    if (futureTimed >= hours.length * 7) return false;

    const inserted = await this.insertHourlySlots(
      service.id,
      today,
      14,
      hours,
      totalCapacity,
    );
    return inserted > 0;
  }

  /**
   * Bulk-insert hourly rows for `days` × `hours` in a single statement.
   * Existing rows are skipped via the partial unique index uq_avail_timed,
   * so this is safe to call repeatedly and from concurrent requests.
   */
  private async insertHourlySlots(
    serviceId: string,
    fromIso: string,
    days: number,
    hours: number[],
    totalCapacity: number,
  ): Promise<number> {
    if (!days || !hours.length) return 0;
    const dates: string[] = [];
    for (let d = 0; d < days; d++) dates.push(addDaysToIso(fromIso, d));
    const starts = hours.map((h) => `${String(h).padStart(2, '0')}:00:00`);
    const ends = hours.map((h) => `${String(h + 1).padStart(2, '0')}:00:00`);

    const rows = (await this.availabilities.query(
      `
      INSERT INTO service_availabilities (
        service_id, date, start_time, end_time,
        total_capacity, available_capacity, status
      )
      SELECT
        $1::uuid,
        d::date,
        t.start_time::time,
        t.end_time::time,
        $2::int,
        $2::int,
        'AVAILABLE'::availability_status
      FROM unnest($3::text[]) AS d
      CROSS JOIN unnest($4::text[], $5::text[]) AS t(start_time, end_time)
      ON CONFLICT (service_id, date, start_time) WHERE (start_time IS NOT NULL)
      DO NOTHING
      RETURNING id
      `,
      [serviceId, totalCapacity, dates, starts, ends],
    )) as unknown[];
    return Array.isArray(rows) ? rows.length : 0;
  }

  private async ownedService(userId: string, serviceId: string) {
    const service = await this.services.findOne({
      where: { id: serviceId },
      relations: ['availabilities', 'category', 'provider'],
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    const ownerId = service.provider?.userId;
    if (ownerId) {
      if (ownerId !== userId) {
        throw new ForbiddenException('Not your service');
      }
      return service;
    }
    await this.providers.assertOwned(userId, service.providerId);
    return service;
  }

  async update(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.ownedService(userId, serviceId);
    if (dto.name !== undefined) service.name = dto.name;
    if (dto.description !== undefined) service.description = dto.description;
    if (dto.categoryId !== undefined) service.categoryId = dto.categoryId;
    if (dto.basePrice !== undefined) service.basePrice = dto.basePrice;
    if (dto.depositPercentage !== undefined) {
      service.depositPercentage = dto.depositPercentage;
    }
    if (dto.durationMinutes !== undefined) {
      service.durationMinutes = dto.durationMinutes;
    }
    if (dto.attributes !== undefined) {
      service.attributes = dto.attributes;
      await this.syncBrandFromAttributes(dto.attributes);
    }
    if (dto.images !== undefined) service.images = dto.images;
    return this.services.save(service);
  }

  async remove(userId: string, serviceId: string) {
    const service = await this.ownedService(userId, serviceId);
    service.status = RecordStatus.INACTIVE;
    await this.services.save(service);
    return { id: service.id, deleted: true };
  }

  async addAvailability(
    userId: string,
    serviceId: string,
    dto: CreateAvailabilityDto,
  ) {
    await this.ownedService(userId, serviceId);
    const totalCapacity = dto.totalCapacity ?? 1;
    const blocked = dto.status === 'BLOCKED';
    const row = this.availabilities.create({
      serviceId,
      date: dto.date,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      totalCapacity,
      availableCapacity: blocked ? 0 : totalCapacity,
      customPrice: dto.customPrice ?? null,
      status: blocked
        ? AvailabilityStatus.BLOCKED
        : AvailabilityStatus.AVAILABLE,
    });
    return this.availabilities.save(row);
  }

  async updateAvailabilityStatus(
    userId: string,
    serviceId: string,
    availabilityId: string,
    status: 'AVAILABLE' | 'BLOCKED',
  ) {
    await this.ownedService(userId, serviceId);
    const row = await this.availabilities.findOne({
      where: { id: availabilityId, serviceId },
    });
    if (!row) throw new NotFoundException('Availability not found');

    if (status === 'BLOCKED') {
      row.status = AvailabilityStatus.BLOCKED;
      row.availableCapacity = 0;
    } else {
      row.status = AvailabilityStatus.AVAILABLE;
      row.availableCapacity = Math.max(1, row.totalCapacity);
    }
    return this.availabilities.save(row);
  }

  async seedHourlyAvailabilities(
    userId: string,
    serviceId: string,
    dto: SeedHourlyAvailabilityDto,
  ) {
    const service = await this.ownedService(userId, serviceId);
    const days = dto.days ?? 14;
    const totalCapacity = dto.totalCapacity ?? 1;
    const startHour = dto.startHour ?? 8;
    const endHour = dto.endHour ?? 22;
    const startIso = (dto.fromDate ?? toIsoDateOnly(new Date())).slice(0, 10);

    const hours = resolveSeedHours(dto, service.attributes);

    const inserted = await this.insertHourlySlots(
      serviceId,
      startIso,
      days,
      hours,
      totalCapacity,
    );
    return {
      inserted,
      days,
      startHour: hours[0] ?? startHour,
      endHour: (hours[hours.length - 1] ?? endHour - 1) + 1,
      hours,
      totalCapacity,
    };
  }

  async seedAvailabilities(
    userId: string,
    serviceId: string,
    dto: SeedAvailabilityDto,
  ) {
    await this.ownedService(userId, serviceId);
    const days = dto.days ?? 90;
    const totalCapacity = dto.totalCapacity ?? 1;
    const start = dto.fromDate
      ? parseIsoDate(dto.fromDate)
      : parseIsoDate(toIsoDateOnly(new Date()));

    const from = toIsoDateOnly(start);
    const toExclusive = toIsoDateOnly(
      new Date(start.getTime() + days * 24 * 60 * 60 * 1000),
    );

    const existing = await this.availabilities
      .createQueryBuilder('a')
      .select('a.date', 'date')
      .where('a.service_id = :serviceId', { serviceId })
      .andWhere('a.start_time IS NULL')
      .andWhere('a.date >= :from', { from })
      .andWhere('a.date < :to', { to: toExclusive })
      .getRawMany<{ date: unknown }>();

    const have = new Set(existing.map((r) => dateKey(r.date)));

    const missing: string[] = [];
    for (let i = 0; i < days; i++) {
      const iso = toIsoDateOnly(
        new Date(start.getTime() + i * 24 * 60 * 60 * 1000),
      );
      if (!have.has(iso)) missing.push(iso);
    }

    if (!missing.length) {
      return { inserted: 0, days, totalCapacity };
    }

    // Partial unique index uq_avail_all_day — skip collisions safely.
    await this.availabilities.query(
      `
      INSERT INTO service_availabilities (
        service_id, date, start_time, end_time,
        total_capacity, available_capacity, status
      )
      SELECT
        $1::uuid,
        d::date,
        NULL,
        NULL,
        $2::int,
        $2::int,
        'AVAILABLE'::availability_status
      FROM unnest($3::text[]) AS d
      ON CONFLICT (service_id, date) WHERE (start_time IS NULL)
      DO NOTHING
      `,
      [serviceId, totalCapacity, missing],
    );

    return { inserted: missing.length, days, totalCapacity };
  }
}

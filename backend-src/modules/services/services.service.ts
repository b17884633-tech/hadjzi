import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceItem } from './entities/service-item.entity';
import { ServiceAvailability } from './entities/service-availability.entity';
import {
  CreateAvailabilityDto,
  CreateServiceDto,
  SeedAvailabilityDto,
  SeedHourlyAvailabilityDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { ProvidersService } from '../providers/providers.service';
import { AvailabilityStatus, RecordStatus } from '../../common/enums';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { DEFAULT_DEPOSIT_PERCENTAGE } from '../../common/constants/booking.constants';

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
  constructor(
    @InjectRepository(ServiceItem)
    private readonly services: Repository<ServiceItem>,
    @InjectRepository(ServiceAvailability)
    private readonly availabilities: Repository<ServiceAvailability>,
    @InjectRepository(PlatformSetting)
    private readonly settings: Repository<PlatformSetting>,
    private readonly providers: ProvidersService,
  ) {}

  async create(userId: string, dto: CreateServiceDto) {
    const provider = await this.providers.assertOwned(userId, dto.providerId);
    const depositPercentage =
      dto.depositPercentage ?? (await this.defaultDepositPercentage());
    const item = this.services.create({
      providerId: provider.id,
      categoryId: dto.categoryId ?? provider.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      depositPercentage,
      durationMinutes: dto.durationMinutes ?? null,
      attributes: dto.attributes ?? {},
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

  async findPublic(id: string) {
    let item = await this.services.findOne({
      where: { id, status: RecordStatus.ACTIVE },
      relations: ['provider', 'category', 'availabilities'],
    });
    if (!item) {
      throw new NotFoundException('Service not found');
    }

    // Sports packages: ensure bookable hourly slots exist for the price windows.
    const healed = await this.ensureHourlySlotsForService(item);
    if (healed) {
      item = await this.services.findOne({
        where: { id, status: RecordStatus.ACTIVE },
        relations: ['provider', 'category', 'availabilities'],
      });
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

  /** Insert missing hourly rows from attributes.pricePeriods (no-op if none). */
  private async ensureHourlySlotsForService(service: ServiceItem): Promise<boolean> {
    const attrs = (service.attributes ?? {}) as Record<string, unknown>;
    const periods = attrs.pricePeriods;
    if (!Array.isArray(periods) || periods.length === 0) return false;

    const hours = resolveSeedHours({}, attrs);
    if (!hours.length) return false;

    const today = toIsoDateOnly(new Date());
    const futureTimed = (service.availabilities ?? []).filter((a) => {
      const d = dateKey(a.date);
      return !!a.startTime && d >= today;
    }).length;
    // Need several days × hours to feel bookable in the strip.
    if (futureTimed >= hours.length * 7) return false;

    const days = 14;
    let inserted = 0;
    for (let d = 0; d < days; d++) {
      const iso = addDaysToIso(today, d);
      for (const h of hours) {
        const startTime = `${String(h).padStart(2, '0')}:00:00`;
        const endTime = `${String(h + 1).padStart(2, '0')}:00:00`;
        const exists = await this.availabilities
          .createQueryBuilder('a')
          .where('a.service_id = :serviceId', { serviceId: service.id })
          .andWhere('a.date = :iso', { iso })
          .andWhere('a.start_time = :startTime', { startTime })
          .getOne();
        if (exists) continue;
        await this.availabilities.save(
          this.availabilities.create({
            serviceId: service.id,
            date: iso,
            startTime,
            endTime,
            totalCapacity: 1,
            availableCapacity: 1,
            status: AvailabilityStatus.AVAILABLE,
          }),
        );
        inserted += 1;
      }
    }
    return inserted > 0;
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
    if (dto.attributes !== undefined) service.attributes = dto.attributes;
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

    let inserted = 0;
    for (let d = 0; d < days; d++) {
      const iso = addDaysToIso(startIso, d);
      for (const h of hours) {
        const startTime = `${String(h).padStart(2, '0')}:00:00`;
        const endTime = `${String(h + 1).padStart(2, '0')}:00:00`;
        const exists = await this.availabilities
          .createQueryBuilder('a')
          .where('a.service_id = :serviceId', { serviceId })
          .andWhere('a.date = :iso', { iso })
          .andWhere('a.start_time = :startTime', { startTime })
          .getOne();
        if (exists) continue;
        await this.availabilities.save(
          this.availabilities.create({
            serviceId,
            date: iso,
            startTime,
            endTime,
            totalCapacity,
            availableCapacity: totalCapacity,
            status: AvailabilityStatus.AVAILABLE,
          }),
        );
        inserted += 1;
      }
    }
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

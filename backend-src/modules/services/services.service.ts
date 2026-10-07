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
  UpdateServiceDto,
} from './dto/service.dto';
import { ProvidersService } from '../providers/providers.service';
import { RecordStatus } from '../../common/enums';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { DEFAULT_DEPOSIT_PERCENTAGE } from '../../common/constants/booking.constants';

function toIsoDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Normalize pg date / Date / string into YYYY-MM-DD. */
function dateKey(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return toIsoDateOnly(v);
  }
  const s = String(v ?? '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return toIsoDateOnly(parsed);
  return s.slice(0, 10);
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
    const item = await this.services.findOne({
      where: { id, status: RecordStatus.ACTIVE },
      relations: ['provider', 'category', 'availabilities'],
    });
    if (!item) {
      throw new NotFoundException('Service not found');
    }
    return item;
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
    const row = this.availabilities.create({
      serviceId,
      date: dto.date,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      totalCapacity,
      availableCapacity: totalCapacity,
      customPrice: dto.customPrice ?? null,
    });
    return this.availabilities.save(row);
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

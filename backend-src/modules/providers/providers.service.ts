import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { ProviderOffer } from './entities/provider-offer.entity';
import { MedicalSpecialty } from './entities/medical-specialty.entity';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import {
  CreateProviderOfferDto,
  UpdateProviderOfferDto,
} from './dto/provider-offer.dto';
import {
  DisputeStatus,
  ProviderStatus,
  RecordStatus,
  UserRole,
} from '../../common/enums';
import { UsersService } from '../users/users.service';
import { Dispute } from '../disputes/entities/dispute.entity';
import { TtlCache } from '../../common/utils/ttl-cache';

function toDateKey(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(value);
  return new Date(d.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function assertOfferRange(startsOn: string, endsOn: string) {
  const a = toDateKey(startsOn);
  const b = toDateKey(endsOn);
  if (b < a) {
    throw new BadRequestException('تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية');
  }
  return { startsOn: a, endsOn: b };
}

export type FacilityDisabledBy = 'ADMIN' | 'PROVIDER';

const DISABLE_TAG = (providerId: string) => `[FACILITY_DISABLE:${providerId}]`;

function normalizeSpecialtyName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  return name.length ? name : null;
}

type ActiveOfferFacility = {
  id: string;
  providerId: string;
  discountPercent: number;
  startsOn: string;
  endsOn: string;
  provider: {
    id: string;
    businessName: string;
    images: string[];
    categoryId: number | null;
    category: { id: number; name: string } | null;
    city: { id: number; name: string } | null;
  } | null;
};

@Injectable()
export class ProvidersService {
  private readonly specialtiesCache = new TtlCache<MedicalSpecialty[]>(120_000);
  /** Legacy specialties living only in facility attributes are folded in once per process. */
  private specialtiesBackfilled = false;
  /** Home-screen offer banners — public, hit on every app open. */
  private readonly activeOffersCache = new TtlCache<ActiveOfferFacility[]>(60_000);

  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(ProviderOffer)
    private readonly offers: Repository<ProviderOffer>,
    @InjectRepository(MedicalSpecialty)
    private readonly specialties: Repository<MedicalSpecialty>,
    @InjectRepository(Dispute)
    private readonly disputes: Repository<Dispute>,
    private readonly users: UsersService,
  ) {}

  /**
   * All known specialties: catalog + any specialty still only on facility attributes.
   */
  async listMedicalSpecialties() {
    const cached = this.specialtiesCache.get();
    if (cached) return cached;

    if (!this.specialtiesBackfilled) {
      // New specialties are synced on every facility write (syncSpecialtyFromAttributes),
      // so this scan only has to catch rows created before that existed.
      const rows = await this.providers
        .createQueryBuilder('p')
        .select(`DISTINCT trim(p.attributes->>'specialty')`, 'specialty')
        .where(`p.attributes ? 'specialty'`)
        .andWhere(`nullif(trim(p.attributes->>'specialty'), '') IS NOT NULL`)
        .getRawMany<{ specialty: string }>();
      for (const row of rows) {
        await this.ensureMedicalSpecialty(row.specialty);
      }
      // Ensure «عام» always exists for hospitals / general practice.
      await this.ensureMedicalSpecialty('عام');
      this.specialtiesBackfilled = true;
    }

    return this.specialtiesCache.set(
      await this.specialties.find({ order: { name: 'ASC' } }),
    );
  }

  async ensureMedicalSpecialty(rawName: string) {
    const name = normalizeSpecialtyName(rawName);
    if (!name) return null;
    const nameKey = name.toLowerCase();
    const existing = await this.specialties.findOne({ where: { nameKey } });
    if (existing) return existing;
    try {
      const saved = await this.specialties.save(
        this.specialties.create({ name, nameKey }),
      );
      this.specialtiesCache.clear();
      return saved;
    } catch {
      return this.specialties.findOne({ where: { nameKey } });
    }
  }

  private async syncSpecialtyFromAttributes(
    attributes: Record<string, unknown> | null | undefined,
  ) {
    const specialty = normalizeSpecialtyName(attributes?.specialty);
    if (specialty) await this.ensureMedicalSpecialty(specialty);
  }

  async createForUser(userId: string, dto: CreateProviderDto) {
    const attributes = dto.attributes ?? {};
    await this.syncSpecialtyFromAttributes(attributes);
    const provider = this.providers.create({
      userId,
      businessName: dto.businessName,
      categoryId: dto.categoryId ?? null,
      description: dto.description ?? null,
      cityId: dto.cityId ?? null,
      regionId: dto.regionId ?? null,
      addressDetails: dto.addressDetails ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      images: dto.images ?? [],
      cancellationPolicy: dto.cancellationPolicy ?? null,
      attributes,
      status: ProviderStatus.PENDING_REVIEW,
    });
    await this.providers.save(provider);
    await this.users.setRole(userId, UserRole.PROVIDER);
    return this.findOwned(userId, provider.id);
  }

  async listMine(userId: string) {
    return this.providers.find({
      where: { userId },
      relations: ['category', 'city', 'region', 'services'],
      order: { createdAt: 'DESC' },
    });
  }

  async mine(userId: string) {
    const list = await this.listMine(userId);
    if (!list.length) {
      throw new NotFoundException('Provider profile not found');
    }
    return list[0];
  }

  async findOwned(userId: string, providerId: string) {
    const provider = await this.providers.findOne({
      where: { id: providerId, userId },
      relations: ['category', 'city', 'region', 'services'],
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return provider;
  }

  /** Alias used by ServicesService — same as findOwned. */
  assertOwned(userId: string, providerId: string) {
    return this.findOwned(userId, providerId);
  }

  async findPublic(id: string) {
    const provider = await this.providers.findOne({
      where: { id, status: ProviderStatus.APPROVED },
      relations: ['category', 'city', 'region', 'services'],
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    // Soft-deleted packages must not appear (or be bookable) on the client.
    provider.services = (provider.services ?? []).filter(
      (s) => s.status === RecordStatus.ACTIVE,
    );
    const activeOffer = await this.findActiveOfferForProvider(provider.id);
    return {
      ...provider,
      activeOffer: activeOffer
        ? {
            id: activeOffer.id,
            providerId: activeOffer.providerId,
            discountPercent: Number(activeOffer.discountPercent),
            startsOn: toDateKey(activeOffer.startsOn),
            endsOn: toDateKey(activeOffer.endsOn),
          }
        : null,
    };
  }

  /** Highest active discount for a provider on a given stay date (defaults today). */
  async findActiveOfferForProvider(
    providerId: string,
    onDate?: string,
  ): Promise<ProviderOffer | null> {
    const day = toDateKey(onDate ?? new Date());
    return (
      (await this.offers
        .createQueryBuilder('o')
        .where('o.provider_id = :providerId', { providerId })
        .andWhere('o.starts_on <= :day', { day })
        .andWhere('o.ends_on >= :day', { day })
        .orderBy('o.discount_percent', 'DESC')
        .getOne()) ?? null
    );
  }

  /** Approved facilities with an offer window that includes today (for home banners). */
  async listActiveOfferFacilities(): Promise<ActiveOfferFacility[]> {
    const cached = this.activeOffersCache.get();
    if (cached) return cached;

    const day = toDateKey(new Date());
    const rows = await this.offers
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.provider', 'p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.city', 'city')
      .where('p.status = :status', { status: ProviderStatus.APPROVED })
      .andWhere('o.starts_on <= :day', { day })
      .andWhere('o.ends_on >= :day', { day })
      .orderBy('o.discount_percent', 'DESC')
      .addOrderBy('o.updated_at', 'DESC')
      .getMany();

    // One slide per facility — keep the strongest offer.
    const byProvider = new Map<string, (typeof rows)[0]>();
    for (const row of rows) {
      const existing = byProvider.get(row.providerId);
      if (!existing || Number(row.discountPercent) > Number(existing.discountPercent)) {
        byProvider.set(row.providerId, row);
      }
    }
    const result: ActiveOfferFacility[] = Array.from(byProvider.values()).map(
      (o) => ({
        id: o.id,
        providerId: o.providerId,
        discountPercent: Number(o.discountPercent),
        startsOn: toDateKey(o.startsOn),
        endsOn: toDateKey(o.endsOn),
        provider: o.provider
          ? {
              id: o.provider.id,
              businessName: o.provider.businessName,
              images: o.provider.images ?? [],
              categoryId: o.provider.categoryId,
              category: o.provider.category
                ? { id: o.provider.category.id, name: o.provider.category.name }
                : null,
              city: o.provider.city
                ? { id: o.provider.city.id, name: o.provider.city.name }
                : null,
            }
          : null,
      }),
    );
    return this.activeOffersCache.set(result);
  }

  async listOffersOwned(userId: string, providerId: string) {
    await this.findOwned(userId, providerId);
    const rows = await this.offers.find({
      where: { providerId },
      order: { startsOn: 'DESC' },
    });
    return rows.map((o) => ({
      ...o,
      discountPercent: Number(o.discountPercent),
      startsOn: toDateKey(o.startsOn),
      endsOn: toDateKey(o.endsOn),
    }));
  }

  async createOfferOwned(
    userId: string,
    providerId: string,
    dto: CreateProviderOfferDto,
  ) {
    await this.findOwned(userId, providerId);
    const { startsOn, endsOn } = assertOfferRange(dto.startsOn, dto.endsOn);
    const offer = this.offers.create({
      providerId,
      discountPercent: dto.discountPercent,
      startsOn,
      endsOn,
    });
    const saved = await this.offers.save(offer);
    this.activeOffersCache.clear();
    return {
      ...saved,
      discountPercent: Number(saved.discountPercent),
      startsOn: toDateKey(saved.startsOn),
      endsOn: toDateKey(saved.endsOn),
    };
  }

  async updateOfferOwned(
    userId: string,
    providerId: string,
    offerId: string,
    dto: UpdateProviderOfferDto,
  ) {
    await this.findOwned(userId, providerId);
    const offer = await this.offers.findOne({
      where: { id: offerId, providerId },
    });
    if (!offer) throw new NotFoundException('العرض غير موجود');

    if (dto.discountPercent != null) offer.discountPercent = dto.discountPercent;
    const startsOn = dto.startsOn != null ? toDateKey(dto.startsOn) : toDateKey(offer.startsOn);
    const endsOn = dto.endsOn != null ? toDateKey(dto.endsOn) : toDateKey(offer.endsOn);
    const range = assertOfferRange(startsOn, endsOn);
    offer.startsOn = range.startsOn;
    offer.endsOn = range.endsOn;

    const saved = await this.offers.save(offer);
    this.activeOffersCache.clear();
    return {
      ...saved,
      discountPercent: Number(saved.discountPercent),
      startsOn: toDateKey(saved.startsOn),
      endsOn: toDateKey(saved.endsOn),
    };
  }

  async deleteOfferOwned(userId: string, providerId: string, offerId: string) {
    await this.findOwned(userId, providerId);
    const offer = await this.offers.findOne({
      where: { id: offerId, providerId },
    });
    if (!offer) throw new NotFoundException('العرض غير موجود');
    await this.offers.remove(offer);
    this.activeOffersCache.clear();
    return { ok: true };
  }

  async updateOwned(userId: string, providerId: string, dto: UpdateProviderDto) {
    const provider = await this.findOwned(userId, providerId);
    if (dto.businessName !== undefined) provider.businessName = dto.businessName;
    if (dto.description !== undefined) provider.description = dto.description;
    if (dto.addressDetails !== undefined) {
      provider.addressDetails = dto.addressDetails;
    }
    if (dto.latitude !== undefined) provider.latitude = dto.latitude;
    if (dto.longitude !== undefined) provider.longitude = dto.longitude;
    if (dto.images !== undefined) provider.images = dto.images;
    if (dto.cancellationPolicy !== undefined) {
      provider.cancellationPolicy = dto.cancellationPolicy;
    }
    if (dto.attributes !== undefined) {
      // Replace jsonb wholesale so TypeORM always persists nested key changes
      provider.attributes = { ...(dto.attributes ?? {}) };
      await this.syncSpecialtyFromAttributes(provider.attributes);
    }
    await this.providers.save(provider);
    return this.findOwned(userId, providerId);
  }

  /**
   * Provider can hide a facility (with a reason) or re-show it only if they
   * were the ones who disabled it. Admin-disabled facilities stay locked.
   */
  async setEnabled(
    userId: string,
    providerId: string,
    enabled: boolean,
    reason?: string,
  ) {
    const provider = await this.findOwned(userId, providerId);
    const attrs = { ...(provider.attributes ?? {}) } as Record<string, unknown>;
    const disabledBy = attrs.disabledBy as FacilityDisabledBy | undefined;

    if (enabled) {
      if (provider.status !== ProviderStatus.SUSPENDED) {
        return this.findOwned(userId, providerId);
      }
      if (disabledBy === 'ADMIN') {
        throw new ForbiddenException(
          'تم إيقاف هذه المنشأة من الإدارة — لا يمكن تفعيلها إلا بواسطة الأدمن',
        );
      }
      provider.status = ProviderStatus.APPROVED;
      delete attrs.disabledBy;
      delete attrs.disableReason;
      delete attrs.disabledAt;
      provider.attributes = attrs;
      await this.providers.save(provider);
      this.activeOffersCache.clear();
      await this.resolveOpenFacilityDisableDisputes(provider.id, userId);
      return this.findOwned(userId, providerId);
    }

    const note = (reason ?? '').trim();
    if (note.length < 5) {
      throw new BadRequestException(
        'اكتب سبب تعطيل المنشأة (5 أحرف على الأقل)',
      );
    }

    provider.status = ProviderStatus.SUSPENDED;
    attrs.disabledBy = 'PROVIDER';
    attrs.disableReason = note;
    attrs.disabledAt = new Date().toISOString();
    provider.attributes = attrs;
    await this.providers.save(provider);
    this.activeOffersCache.clear();

    await this.disputes.save(
      this.disputes.create({
        bookingId: null,
        raisedBy: userId,
        reason: `${DISABLE_TAG(provider.id)} ${provider.businessName}\n${note}`,
        status: DisputeStatus.OPEN,
        resolution: null,
      }),
    );

    return this.findOwned(userId, providerId);
  }

  /** Used by admin review endpoint — marks who suspended/restored. */
  async review(id: string, status: ProviderStatus) {
    const provider = await this.providers.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    this.applyAdminStatus(provider, status);
    await this.providers.save(provider);
    this.activeOffersCache.clear();
    return this.providers.findOneByOrFail({ id });
  }

  /** Shared helper for admin status changes (attributes + status). */
  applyAdminStatus(provider: Provider, status: ProviderStatus) {
    const attrs = { ...(provider.attributes ?? {}) } as Record<string, unknown>;
    if (status === ProviderStatus.SUSPENDED) {
      attrs.disabledBy = 'ADMIN';
      delete attrs.disableReason;
      attrs.disabledAt = new Date().toISOString();
    } else if (
      status === ProviderStatus.APPROVED ||
      status === ProviderStatus.PENDING_REVIEW
    ) {
      delete attrs.disabledBy;
      delete attrs.disableReason;
      delete attrs.disabledAt;
    }
    provider.attributes = attrs;
    provider.status = status;
  }

  async updateMine(userId: string, dto: UpdateProviderDto) {
    const first = await this.mine(userId);
    return this.updateOwned(userId, first.id, dto);
  }

  private async resolveOpenFacilityDisableDisputes(
    providerId: string,
    userId: string,
  ) {
    const tag = DISABLE_TAG(providerId);
    const open = await this.disputes.find({
      where: {
        raisedBy: userId,
        status: DisputeStatus.OPEN,
      },
    });
    const mine = open.filter((d) => (d.reason ?? '').includes(tag));
    for (const d of mine) {
      d.status = DisputeStatus.RESOLVED;
      d.resolution = 'أعاد المزود تفعيل المنشأة بنفسه';
      await this.disputes.save(d);
    }
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import {
  DisputeStatus,
  ProviderStatus,
  RecordStatus,
  UserRole,
} from '../../common/enums';
import { UsersService } from '../users/users.service';
import { Dispute } from '../disputes/entities/dispute.entity';

export type FacilityDisabledBy = 'ADMIN' | 'PROVIDER';

const DISABLE_TAG = (providerId: string) => `[FACILITY_DISABLE:${providerId}]`;

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(Dispute)
    private readonly disputes: Repository<Dispute>,
    private readonly users: UsersService,
  ) {}

  async createForUser(userId: string, dto: CreateProviderDto) {
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
      attributes: dto.attributes ?? {},
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
    return provider;
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

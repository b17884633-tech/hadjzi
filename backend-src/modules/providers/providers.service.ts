import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { ProviderStatus, UserRole } from '../../common/enums';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
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
    const saved = await this.providers.save(provider);
    await this.users.setRole(userId, UserRole.PROVIDER);
    return this.findOwned(userId, saved.id);
  }

  /** All facilities owned by the user. */
  async listMine(userId: string) {
    return this.providers.find({
      where: { userId },
      relations: ['category', 'city', 'region'],
      order: { createdAt: 'DESC' },
    });
  }

  /** @deprecated prefer listMine / findOwned — kept for first-facility callers */
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
      relations: ['category', 'city', 'region'],
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return provider;
  }

  async assertOwned(userId: string, providerId: string) {
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
    return provider;
  }

  async updateOwned(userId: string, providerId: string, dto: UpdateProviderDto) {
    const provider = await this.findOwned(userId, providerId);
    if (dto.businessName !== undefined) provider.businessName = dto.businessName;
    // Category and city are fixed after creation — ignore client attempts to change them.
    if (dto.description !== undefined) provider.description = dto.description;
    if (dto.regionId !== undefined) provider.regionId = dto.regionId;
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

  /** Owner can hide (suspend) or re-show the facility. */
  async setEnabled(userId: string, providerId: string, enabled: boolean) {
    const provider = await this.findOwned(userId, providerId);
    if (enabled) {
      provider.status =
        provider.status === ProviderStatus.REJECTED
          ? ProviderStatus.PENDING_REVIEW
          : ProviderStatus.APPROVED;
    } else {
      provider.status = ProviderStatus.SUSPENDED;
    }
    await this.providers.save(provider);
    return this.findOwned(userId, providerId);
  }

  async updateMine(userId: string, dto: UpdateProviderDto) {
    const first = await this.mine(userId);
    return this.updateOwned(userId, first.id, dto);
  }

  async review(id: string, status: ProviderStatus) {
    const provider = await this.providers.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    await this.providers.update(id, { status });
    return this.providers.findOneByOrFail({ id });
  }
}

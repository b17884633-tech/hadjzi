import {
  ConflictException,
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
    const existing = await this.providers.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Provider profile already exists');
    }
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
      status: ProviderStatus.PENDING_REVIEW,
    });
    const saved = await this.providers.save(provider);
    await this.users.setRole(userId, UserRole.PROVIDER);
    return saved;
  }

  async mine(userId: string) {
    const provider = await this.providers.findOne({
      where: { userId },
      relations: ['category', 'city', 'region'],
    });
    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }
    return provider;
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

  async updateMine(userId: string, dto: UpdateProviderDto) {
    const provider = await this.mine(userId);
    await this.providers.update(provider.id, dto);
    return this.mine(userId);
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

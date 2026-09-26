import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceItem } from './entities/service-item.entity';
import { ServiceAvailability } from './entities/service-availability.entity';
import { CreateAvailabilityDto, CreateServiceDto } from './dto/service.dto';
import { ProvidersService } from '../providers/providers.service';
import { RecordStatus } from '../../common/enums';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceItem)
    private readonly services: Repository<ServiceItem>,
    @InjectRepository(ServiceAvailability)
    private readonly availabilities: Repository<ServiceAvailability>,
    private readonly providers: ProvidersService,
  ) {}

  async create(userId: string, dto: CreateServiceDto) {
    const provider = await this.providers.mine(userId);
    const item = this.services.create({
      providerId: provider.id,
      categoryId: dto.categoryId ?? provider.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      depositPercentage: dto.depositPercentage ?? 20,
      durationMinutes: dto.durationMinutes ?? null,
      attributes: dto.attributes ?? {},
      images: dto.images ?? [],
    });
    return this.services.save(item);
  }

  async listMine(userId: string) {
    const provider = await this.providers.mine(userId);
    return this.services.find({
      where: { providerId: provider.id },
      relations: ['availabilities', 'category'],
      order: { createdAt: 'DESC' },
    });
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

  async addAvailability(userId: string, serviceId: string, dto: CreateAvailabilityDto) {
    const provider = await this.providers.mine(userId);
    const service = await this.services.findOneBy({ id: serviceId });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (service.providerId !== provider.id) {
      throw new ForbiddenException('Not your service');
    }
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
}

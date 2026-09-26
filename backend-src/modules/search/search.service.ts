import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { Provider } from '../providers/entities/provider.entity';
import { CategoriesService } from '../categories/categories.service';
import { ProviderStatus, RecordStatus } from '../../common/enums';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(City)
    private readonly cities: Repository<City>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    private readonly categories: CategoriesService,
  ) {}

  destinations() {
    return this.cities.find({
      where: { status: RecordStatus.ACTIVE },
      relations: ['regions'],
      order: { name: 'ASC' },
    });
  }

  async search(query: {
    cityId?: number;
    regionId?: number;
    categoryId?: number;
  }) {
    const qb = this.providers
      .createQueryBuilder('provider')
      .leftJoinAndSelect('provider.category', 'category')
      .leftJoinAndSelect('provider.city', 'city')
      .leftJoinAndSelect('provider.region', 'region')
      .leftJoinAndSelect('provider.services', 'service')
      .where('provider.status = :status', { status: ProviderStatus.APPROVED });

    if (query.cityId) {
      qb.andWhere('provider.cityId = :cityId', { cityId: query.cityId });
    }
    if (query.regionId) {
      qb.andWhere('provider.regionId = :regionId', { regionId: query.regionId });
    }
    if (query.categoryId) {
      const ids = await this.categories.collectDescendantIds(query.categoryId);
      qb.andWhere(
        '(provider.categoryId IN (:...ids) OR service.categoryId IN (:...ids))',
        { ids },
      );
    }

    return qb.orderBy('provider.businessName', 'ASC').getMany();
  }
}

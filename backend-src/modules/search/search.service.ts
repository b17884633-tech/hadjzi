import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { Provider } from '../providers/entities/provider.entity';
import { CategoriesService } from '../categories/categories.service';
import { AvailabilityStatus, ProviderStatus, RecordStatus } from '../../common/enums';

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
    date?: string;
    endDate?: string;
    time?: string;
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

    if (query.date) {
      const params: Record<string, string> = {
        availDate: query.date,
        availStatus: AvailabilityStatus.AVAILABLE,
      };
      let timeClause = '';
      if (query.time) {
        params.availTime = `${query.time}:00`;
        timeClause = `
          AND (sa.start_time IS NULL OR sa.start_time <= :availTime::time)
          AND (sa.end_time IS NULL OR sa.end_time > :availTime::time)
        `;
      }

      // Range stay: require an available slot on check-in; optionally also on last night
      let endClause = '';
      if (query.endDate && query.endDate > query.date) {
        params.availEndDate = query.endDate;
        endClause = `
          AND EXISTS (
            SELECT 1 FROM service_availabilities sa2
            WHERE sa2.service_id = si.id
              AND sa2.date = (:availEndDate::date - INTERVAL '1 day')
              AND sa2.status = :availStatus
              AND sa2.available_capacity > 0
          )
        `;
      }

      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM service_availabilities sa
          INNER JOIN services si ON si.id = sa.service_id
          WHERE si.provider_id = provider.id
            AND sa.date = :availDate
            AND sa.status = :availStatus
            AND sa.available_capacity > 0
            ${timeClause}
            ${endClause}
        )`,
        params,
      );
    }

    return qb.orderBy('provider.businessName', 'ASC').getMany();
  }
}

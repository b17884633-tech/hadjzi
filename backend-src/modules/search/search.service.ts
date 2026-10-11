import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Review } from '../reviews/entities/review.entity';
import { CategoriesService } from '../categories/categories.service';
import { AvailabilityStatus, ProviderStatus, RecordStatus } from '../../common/enums';
import { TtlCache } from '../../common/utils/ttl-cache';

const SEARCH_RESULT_LIMIT = 100;

export type ProviderSearchResult = Provider & {
  rating: number | null;
  reviewCount: number;
};

@Injectable()
export class SearchService {
  private readonly destinationsCache = new TtlCache<City[]>(120_000);

  constructor(
    @InjectRepository(City)
    private readonly cities: Repository<City>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly categories: CategoriesService,
  ) {}

  async destinations() {
    const cached = this.destinationsCache.get();
    if (cached) return cached;
    const rows = await this.cities.find({
      where: { status: RecordStatus.ACTIVE },
      relations: ['regions'],
      order: { name: 'ASC' },
    });
    return this.destinationsCache.set(rows);
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

    const rows = await qb
      .orderBy('provider.businessName', 'ASC')
      .take(SEARCH_RESULT_LIMIT)
      .getMany();

    return this.attachRatingStats(rows);
  }

  /** Batch-load average rating + count so list cards stay cheap (one query). */
  private async attachRatingStats(
    providers: Provider[],
  ): Promise<ProviderSearchResult[]> {
    if (!providers.length) return [];

    const ids = providers.map((p) => p.id);
    const raw = await this.reviews
      .createQueryBuilder('review')
      .select('review.providerId', 'providerId')
      .addSelect('AVG(review.rating)', 'average')
      .addSelect('COUNT(*)::int', 'count')
      .where('review.providerId IN (:...ids)', { ids })
      .groupBy('review.providerId')
      .getRawMany<Record<string, string | number>>();

    const byId = new Map<string, { average: number | null; count: number }>();
    for (const row of raw) {
      const providerId = String(
        row.providerId ?? row.providerid ?? row.provider_id ?? '',
      );
      if (!providerId) continue;
      const count = Number(row.count) || 0;
      const average =
        count > 0
          ? Math.round((Number(row.average) || 0) * 10) / 10
          : null;
      byId.set(providerId, { average, count });
    }

    // Plain objects so rating/reviewCount always serialize in the JSON response.
    return providers.map((provider) => {
      const stats = byId.get(provider.id);
      return {
        id: provider.id,
        businessName: provider.businessName,
        description: provider.description,
        images: provider.images,
        addressDetails: provider.addressDetails,
        cancellationPolicy: provider.cancellationPolicy,
        attributes: provider.attributes,
        categoryId: provider.categoryId,
        cityId: provider.cityId,
        regionId: provider.regionId,
        latitude: provider.latitude,
        longitude: provider.longitude,
        status: provider.status,
        category: provider.category,
        city: provider.city,
        region: provider.region,
        services: provider.services,
        rating: stats?.average ?? null,
        reviewCount: stats?.count ?? 0,
      } as ProviderSearchResult;
    });
  }
}

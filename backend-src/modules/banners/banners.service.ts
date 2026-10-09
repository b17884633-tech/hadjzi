import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { TtlCache } from '../../common/utils/ttl-cache';

@Injectable()
export class BannersService {
  private readonly activeCache = new TtlCache<Banner[]>(45_000);

  constructor(
    @InjectRepository(Banner)
    private readonly banners: Repository<Banner>,
  ) {}

  async active() {
    const cached = this.activeCache.get();
    if (cached) return cached;
    const rows = await this.banners.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return this.activeCache.set(rows);
  }

  async create(dto: CreateBannerDto) {
    const saved = await this.banners.save(this.banners.create(dto));
    this.activeCache.clear();
    return saved;
  }

  async update(id: number, dto: Partial<CreateBannerDto>) {
    const banner = await this.banners.findOneBy({ id });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    await this.banners.update(id, dto);
    this.activeCache.clear();
    return this.banners.findOneByOrFail({ id });
  }
}

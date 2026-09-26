import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly banners: Repository<Banner>,
  ) {}

  active() {
    return this.banners.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  create(dto: CreateBannerDto) {
    return this.banners.save(this.banners.create(dto));
  }

  async update(id: number, dto: Partial<CreateBannerDto>) {
    const banner = await this.banners.findOneBy({ id });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    await this.banners.update(id, dto);
    return this.banners.findOneByOrFail({ id });
  }
}

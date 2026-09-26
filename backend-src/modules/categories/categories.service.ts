import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { RecordStatus } from '../../common/enums';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async tree(includeInactive = false) {
    const where = includeInactive ? {} : { status: RecordStatus.ACTIVE };
    const all = await this.categories.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return this.toTree(all, null);
  }

  async findById(id: number) {
    const category = await this.categories.findOne({
      where: { id },
      relations: ['children', 'parent'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    const category = this.categories.create({
      name: dto.name,
      iconUrl: dto.iconUrl,
      parentId: dto.parentId ?? null,
      bookingType: dto.bookingType,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.categories.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findById(id);
    await this.categories.update(id, dto);
    return this.findById(id);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.categories.update(id, { status: RecordStatus.INACTIVE });
    return { id, status: RecordStatus.INACTIVE };
  }

  async collectDescendantIds(categoryId: number): Promise<number[]> {
    const all = await this.categories.find();
    const ids = [categoryId];
    const walk = (parentId: number) => {
      for (const node of all.filter((c) => c.parentId === parentId)) {
        ids.push(node.id);
        walk(node.id);
      }
    };
    walk(categoryId);
    return ids;
  }

  private toTree(all: Category[], parentId: number | null): Category[] {
    return all
      .filter((c) => (c.parentId ?? null) === parentId)
      .map((c) => ({
        ...c,
        children: this.toTree(all, c.id),
      })) as Category[];
  }
}

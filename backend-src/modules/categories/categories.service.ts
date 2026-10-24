import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { RecordStatus } from '../../common/enums';
import { TtlCache } from '../../common/utils/ttl-cache';

@Injectable()
export class CategoriesService {
  private readonly treeCache = new TtlCache<Category[]>(60_000);
  /** id → parentId for every category; consulted on every /search request. */
  private readonly parentMapCache = new TtlCache<
    Array<Pick<Category, 'id' | 'parentId'>>
  >(60_000);

  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async tree(includeInactive = false) {
    if (!includeInactive) {
      const cached = this.treeCache.get();
      if (cached) return cached;
    }

    const where = includeInactive ? {} : { status: RecordStatus.ACTIVE };
    const all = await this.categories.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    const tree = this.toTree(all, null);
    if (!includeInactive) this.treeCache.set(tree);
    return tree;
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

  async create(dto: CreateCategoryDto) {
    const category = this.categories.create({
      name: dto.name,
      iconUrl: dto.iconUrl,
      parentId: dto.parentId ?? null,
      bookingType: dto.bookingType,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.categories.save(category);
    this.invalidate();
    return saved;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findById(id);
    await this.categories.update(id, dto);
    this.invalidate();
    return this.findById(id);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.categories.update(id, { status: RecordStatus.INACTIVE });
    this.invalidate();
    return { id, status: RecordStatus.INACTIVE };
  }

  private invalidate() {
    this.treeCache.clear();
    this.parentMapCache.clear();
  }

  async collectDescendantIds(categoryId: number): Promise<number[]> {
    const all =
      this.parentMapCache.get() ??
      this.parentMapCache.set(
        await this.categories.find({ select: ['id', 'parentId'] }),
      );
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

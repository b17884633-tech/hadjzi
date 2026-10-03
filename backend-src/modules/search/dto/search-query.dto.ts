import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class SearchQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  regionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}

export type SearchLevel =
  | 'DESTINATION'
  | 'CATEGORY'
  | 'CATEGORY_AND_DESTINATION';

import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

class SearchQueryDto {
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

@Public()
@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('destinations')
  destinations() {
    return this.search.destinations();
  }

  @Get('search')
  query(@Query() query: SearchQueryDto) {
    const level = query.categoryId && (query.cityId || query.regionId)
      ? 'CATEGORY_AND_DESTINATION'
      : query.categoryId
        ? 'CATEGORY'
        : 'DESTINATION';
    return this.search.search(query).then((results) => ({ level, results }));
  }
}

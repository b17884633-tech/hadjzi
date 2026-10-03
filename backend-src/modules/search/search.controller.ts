import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';
import { SearchQueryDto } from './dto/search-query.dto';

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

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // Providers may also book as customers; ownership is enforced in the service.
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @Post('reviews')
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user, dto);
  }

  @Public()
  @Get('providers/:id/reviews')
  list(@Param('id') id: string) {
    return this.reviews.summary(id);
  }
}

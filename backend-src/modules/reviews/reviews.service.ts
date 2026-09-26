import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../../common/enums';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly bookings: BookingService,
  ) {}

  async create(user: User, dto: CreateReviewDto) {
    const booking = await this.bookings.findOneForUser(user, dto.bookingId);
    if (booking.customerId !== user.id) {
      throw new BadRequestException('Only the customer can review');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Review allowed only after completion');
    }
    const existing = await this.reviews.findOne({ where: { bookingId: booking.id } });
    if (existing) {
      throw new BadRequestException('Booking already reviewed');
    }
    return this.reviews.save(
      this.reviews.create({
        bookingId: booking.id,
        customerId: user.id,
        providerId: booking.providerId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );
  }

  async forProvider(providerId: string) {
    return this.reviews.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  async summary(providerId: string) {
    const rows = await this.forProvider(providerId);
    if (rows.length === 0) {
      return { providerId, count: 0, average: 0, reviews: [] };
    }
    const average =
      Math.round((rows.reduce((sum, r) => sum + r.rating, 0) / rows.length) * 10) / 10;
    return { providerId, count: rows.length, average, reviews: rows };
  }
}

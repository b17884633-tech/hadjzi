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

  /** Public page shows the most recent reviews; stats are computed over all of them in SQL. */
  private static readonly PUBLIC_REVIEWS_LIMIT = 200;

  async forProvider(providerId: string) {
    return this.reviews.find({
      where: { providerId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take: ReviewsService.PUBLIC_REVIEWS_LIMIT,
    });
  }

  async summary(providerId: string) {
    const [rows, stats] = await Promise.all([
      this.forProvider(providerId),
      this.reviews
        .createQueryBuilder('review')
        .select('COUNT(*)::int', 'count')
        .addSelect('AVG(review.rating)', 'average')
        .where('review.providerId = :providerId', { providerId })
        .getRawOne<{ count: number; average: string | null }>(),
    ]);
    const reviews = rows.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      customerName: customerDisplayName(r.customer),
      customerId: r.customerId,
    }));
    const count = Number(stats?.count) || 0;
    if (count === 0) {
      return { providerId, count: 0, average: 0, reviews: [] };
    }
    const average = Math.round((Number(stats?.average) || 0) * 10) / 10;
    return { providerId, count, average, reviews };
  }
}

function customerDisplayName(
  customer?: { firstName?: string; lastName?: string } | null,
): string {
  const first = customer?.firstName?.trim() ?? '';
  const last = customer?.lastName?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  return full || 'عميل';
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from './entities/dispute.entity';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/dispute.dto';
import { BookingService } from '../booking/booking.service';
import { DisputeStatus, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputes: Repository<Dispute>,
    private readonly bookings: BookingService,
  ) {}

  async create(user: User, dto: CreateDisputeDto) {
    const booking = await this.bookings.findOneForUser(user, dto.bookingId);
    const open = await this.disputes.findOne({
      where: { bookingId: booking.id, status: DisputeStatus.OPEN },
    });
    if (open) {
      throw new BadRequestException('An open dispute already exists');
    }
    return this.disputes.save(
      this.disputes.create({
        bookingId: booking.id,
        raisedBy: user.id,
        reason: dto.reason,
        status: DisputeStatus.OPEN,
      }),
    );
  }

  list(user: User) {
    if (user.role === UserRole.ADMIN) {
      return this.disputes.find({ order: { createdAt: 'DESC' } });
    }
    return this.disputes.find({
      where: { raisedBy: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async resolve(id: string, dto: ResolveDisputeDto) {
    const dispute = await this.disputes.findOneBy({ id });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    dispute.status = dto.status;
    dispute.resolution = dto.resolution ?? dispute.resolution;
    return this.disputes.save(dispute);
  }
}

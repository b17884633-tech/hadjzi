import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ServiceItem } from '../services/entities/service-item.entity';
import { ServiceAvailability } from '../services/entities/service-availability.entity';
import {
  AvailabilityStatus,
  BookingStatus,
  RecordStatus,
  UserRole,
} from '../../common/enums';
import { canTransition } from './booking.state-machine';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async create(user: User, dto: CreateBookingDto) {
    const quantity = dto.quantity ?? 1;
    const lockMinutes = Number(this.config.get('BOOKING_LOCK_MINUTES') ?? 10);
    const commissionPercentage = Number(
      this.config.get('payment.commissionPercentage') ??
        this.config.get('COMMISSION_PERCENTAGE') ??
        10,
    );

    return this.dataSource.transaction(async (manager) => {
      const service = await manager.findOne(ServiceItem, {
        where: { id: dto.serviceId, status: RecordStatus.ACTIVE },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }

      const availability = await manager
        .createQueryBuilder(ServiceAvailability, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :id', { id: dto.availabilityId })
        .andWhere('slot.service_id = :serviceId', { serviceId: service.id })
        .getOne();

      if (!availability) {
        throw new NotFoundException('Availability slot not found');
      }
      if (availability.status !== AvailabilityStatus.AVAILABLE) {
        throw new BadRequestException('Slot is not available');
      }
      if (availability.availableCapacity < quantity) {
        throw new BadRequestException('Not enough capacity');
      }

      const unitPrice = availability.customPrice ?? service.basePrice;
      const totalAmount = roundMoney(unitPrice * quantity);
      const depositPercentage = Number(service.depositPercentage);
      const depositAmount = roundMoney((totalAmount * depositPercentage) / 100);
      const remainingAmount = roundMoney(totalAmount - depositAmount);
      const commissionAmount = roundMoney((totalAmount * commissionPercentage) / 100);

      availability.availableCapacity -= quantity;
      if (availability.availableCapacity === 0) {
        availability.status = AvailabilityStatus.SOLD_OUT;
      }
      await manager.save(availability);

      const booking = manager.create(Booking, {
        bookingNumber: this.nextBookingNumber(),
        customerId: user.id,
        providerId: service.providerId,
        serviceId: service.id,
        availabilityId: availability.id,
        bookingDate: availability.date,
        startTime: availability.startTime,
        endTime: availability.endTime,
        quantity,
        totalAmount,
        depositPercentage,
        depositAmount,
        remainingAmount,
        commissionPercentage,
        commissionAmount,
        customerNotes: dto.customerNotes ?? null,
        status: BookingStatus.PENDING_PAYMENT,
        temporaryLockUntil: new Date(Date.now() + lockMinutes * 60 * 1000),
      });
      return manager.save(booking);
    });
  }

  async mine(user: User) {
    if (user.role === UserRole.PROVIDER) {
      return this.bookings.find({
        where: { provider: { userId: user.id } },
        relations: ['service', 'provider', 'availability'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.bookings.find({
      where: { customerId: user.id },
      relations: ['service', 'provider', 'availability'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(user: User, id: string) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: ['service', 'provider', 'availability', 'payments'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const isOwner = booking.customerId === user.id;
    const isProvider = booking.provider?.userId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isProvider && !isAdmin) {
      throw new ForbiddenException();
    }
    return booking;
  }

  async transition(bookingId: string, to: BookingStatus) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['availability'],
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (!canTransition(booking.status, to)) {
        throw new BadRequestException(
          `Cannot move booking from ${booking.status} to ${to}`,
        );
      }

      if (
        (to === BookingStatus.CANCELLED || to === BookingStatus.EXPIRED) &&
        booking.availabilityId
      ) {
        const slot = await manager
          .createQueryBuilder(ServiceAvailability, 'slot')
          .setLock('pessimistic_write')
          .where('slot.id = :id', { id: booking.availabilityId })
          .getOne();
        if (slot) {
          slot.availableCapacity += booking.quantity;
          if (slot.availableCapacity > slot.totalCapacity) {
            slot.availableCapacity = slot.totalCapacity;
          }
          if (slot.status === AvailabilityStatus.SOLD_OUT && slot.availableCapacity > 0) {
            slot.status = AvailabilityStatus.AVAILABLE;
          }
          await manager.save(slot);
        }
        booking.temporaryLockUntil = null;
      }

      if (to === BookingStatus.CONFIRMED) {
        booking.temporaryLockUntil = null;
      }

      booking.status = to;
      return manager.save(booking);
    });
  }

  async expirePendingLocks() {
    const due = await this.bookings.find({
      where: { status: BookingStatus.PENDING_PAYMENT },
    });
    const now = new Date();
    const expired: string[] = [];
    for (const booking of due) {
      if (booking.temporaryLockUntil && booking.temporaryLockUntil <= now) {
        await this.transition(booking.id, BookingStatus.EXPIRED);
        expired.push(booking.id);
      }
    }
    return { expired: expired.length, ids: expired };
  }

  private nextBookingNumber() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `BK-${stamp}-${rand}`;
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

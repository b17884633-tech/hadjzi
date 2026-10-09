import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto, CreateDeskBookingDto } from './dto/create-booking.dto';
import { ServiceItem } from '../services/entities/service-item.entity';
import { ServiceAvailability } from '../services/entities/service-availability.entity';
import {
  AvailabilityStatus,
  BookingStatus,
  PaymentStatus,
  PaymentType,
  RecordStatus,
  UserRole,
} from '../../common/enums';
import { canTransition } from './booking.state-machine';
import { User } from '../users/entities/user.entity';
import { Payment } from '../payments/entities/payment.entity';
import {
  BOOKING_LOCK_MINUTES,
  DEFAULT_COMMISSION_PERCENTAGE,
  DEFAULT_DEPOSIT_PERCENTAGE,
} from '../../common/constants/booking.constants';

function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const a = new Date(`${toDateKey(checkIn)}T12:00:00Z`).getTime();
  const b = new Date(`${toDateKey(checkOut)}T12:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function toDateKey(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(value);
  // Noon-shift avoids off-by-one when pg returns DATE as local-midnight UTC.
  return new Date(d.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${toDateKey(iso)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Dates that must have capacity: check-in through check-out inclusive
 * (chalet turnover — departure day stays blocked for new guests).
 * Pricing still uses nightsBetween (exclusive checkout).
 */
function eachBlockedDate(
  checkIn: string | Date,
  checkOutInclusive?: string | Date | null,
): string[] {
  const from = toDateKey(checkIn);
  if (!checkOutInclusive) return [from];
  const to = toDateKey(checkOutInclusive);
  if (to < from) return [from];
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out.length ? out : [from];
}

function buildDeskNotes(dto: CreateDeskBookingDto, nights: number): string {
  const lines = [
    '[حجز مكتبي — بدون دفع إلكتروني]',
    `الاسم: ${dto.guestName.trim()}`,
  ];
  if (dto.guestPhone?.trim()) lines.push(`الهاتف: ${dto.guestPhone.trim()}`);
  if (nights > 1) lines.push(`الليالي: ${nights}`);
  if (dto.checkOutDate) lines.push(`المغادرة: ${dto.checkOutDate}`);
  if (dto.notes?.trim()) lines.push(dto.notes.trim());
  return lines.join('\n');
}

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
    const lockMinutes = Number(
      this.config.get('BOOKING_LOCK_MINUTES') ?? BOOKING_LOCK_MINUTES,
    );
    const commissionPercentage = Number(
      this.config.get('payment.commissionPercentage') ??
        this.config.get('COMMISSION_PERCENTAGE') ??
        DEFAULT_COMMISSION_PERCENTAGE,
    );

    return this.dataSource.transaction(async (manager) => {
      const service = await manager.findOne(ServiceItem, {
        where: { id: dto.serviceId, status: RecordStatus.ACTIVE },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }

      const checkInSlot = await manager
        .createQueryBuilder(ServiceAvailability, 'slot')
        .setLock('pessimistic_write')
        .where('slot.id = :id', { id: dto.availabilityId })
        .andWhere('slot.service_id = :serviceId', { serviceId: service.id })
        .getOne();

      if (!checkInSlot) {
        throw new NotFoundException('Availability slot not found');
      }

      assertSlotWithinPricePeriods(service, checkInSlot);

      const checkInDate = toDateKey(checkInSlot.date);
      const checkOut =
        dto.checkOutDate && toDateKey(dto.checkOutDate) > checkInDate
          ? toDateKey(dto.checkOutDate)
          : null;
      const nightDates = eachBlockedDate(checkInDate, checkOut);
      // Per-night packages: price × nights (exclusive check-out).
      const nights = checkOut ? nightsBetween(checkInDate, checkOut) : 1;

      // Lock every night in the stay (all-day rows). Single-day packages = one night.
      // Also lock sibling packages on the same facility (shared unit inventory).
      const slots = await this.lockStayNights(
        manager,
        service.id,
        service.providerId,
        nightDates,
        quantity,
        checkInSlot,
      );

      const unitPrice = unitPriceForSlot(service, checkInSlot);
      const totalAmount = roundMoney(unitPrice * quantity * nights);
      const depositPercentage = Number(service.depositPercentage);
      const depositAmount = roundMoney((totalAmount * depositPercentage) / 100);
      const remainingAmount = roundMoney(totalAmount - depositAmount);
      const commissionAmount = roundMoney((totalAmount * commissionPercentage) / 100);

      for (const slot of slots) {
        slot.availableCapacity -= quantity;
        if (slot.availableCapacity === 0) {
          slot.status = AvailabilityStatus.SOLD_OUT;
        }
        await manager.save(slot);
      }

      // Soft lock only while customer is mid-checkout. Once payment proof is
      // submitted, keep PENDING_PAYMENT indefinitely until payment is confirmed.
      const holdLock = !dto.paymentSubmitted;

      const booking = manager.create(Booking, {
        bookingNumber: this.nextBookingNumber(),
        customerId: user.id,
        providerId: service.providerId,
        serviceId: service.id,
        availabilityId: checkInSlot.id,
        bookingDate: checkInDate,
        checkOutDate: checkOut,
        startTime: checkInSlot.startTime,
        endTime: checkInSlot.endTime,
        quantity,
        totalAmount,
        depositPercentage,
        depositAmount,
        remainingAmount,
        commissionPercentage,
        commissionAmount,
        customerNotes: dto.customerNotes ?? null,
        status: BookingStatus.PENDING_PAYMENT,
        temporaryLockUntil: holdLock
          ? new Date(Date.now() + lockMinutes * 60 * 1000)
          : null,
      });
      const saved = await manager.save(booking);

      // Customer submitted transfer proof — create a pending payment so admin
      // Wallet can confirm it (mobile checkout does not call /payments/initiate).
      if (dto.paymentSubmitted) {
        const payFull = Boolean(dto.payFull);
        const amount = payFull ? totalAmount : depositAmount;
        const method = (dto.paymentMethod ?? 'TRANSFER').trim().slice(0, 50) || 'TRANSFER';
        const transferRef = dto.transferReference?.trim().slice(0, 100) || null;
        await manager.save(
          manager.create(Payment, {
            bookingId: saved.id,
            customerId: user.id,
            amount,
            // Checkout always records the first customer payment (deposit or full).
            paymentType: PaymentType.DEPOSIT,
            paymentMethod: method,
            gatewayTransactionId: transferRef,
            status: PaymentStatus.INITIATED,
            idempotencyKey: `booking-submit-${saved.id}`,
            paidAt: null,
          }),
        );
      }

      return saved;
    });
  }

  /** Front-desk walk-in: confirmed immediately, no online payment / lock. */
  async createDesk(user: User, dto: CreateDeskBookingDto) {
    if (user.role !== UserRole.PROVIDER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Providers only');
    }

    const quantity = dto.quantity ?? 1;
    const date = dto.date.slice(0, 10);
    const nights = dto.checkOutDate
      ? nightsBetween(date, dto.checkOutDate.slice(0, 10))
      : 1;

    const commissionPercentage = Number(
      this.config.get('payment.commissionPercentage') ??
        this.config.get('COMMISSION_PERCENTAGE') ??
        DEFAULT_COMMISSION_PERCENTAGE,
    );

    return this.dataSource.transaction(async (manager) => {
      const service = await manager.findOne(ServiceItem, {
        where: { id: dto.serviceId, status: RecordStatus.ACTIVE },
        relations: ['provider'],
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }
      if (
        user.role !== UserRole.ADMIN &&
        service.provider?.userId !== user.id
      ) {
        throw new ForbiddenException('Not your service');
      }

      const checkInDate = toDateKey(date);
      const checkOut =
        dto.checkOutDate && toDateKey(dto.checkOutDate) > checkInDate
          ? toDateKey(dto.checkOutDate)
          : null;
      const nightDates = eachBlockedDate(checkInDate, checkOut);
      const stayNights = checkOut ? nightsBetween(checkInDate, checkOut) : 1;

      const checkInSlot = await manager
        .createQueryBuilder(ServiceAvailability, 'slot')
        .setLock('pessimistic_write')
        .where('slot.service_id = :serviceId', { serviceId: service.id })
        .andWhere('slot.date = :date', { date: checkInDate })
        .andWhere('slot.start_time IS NULL')
        .getOne();

      if (!checkInSlot) {
        throw new BadRequestException(
          'لا يوجد توفر لهذا التاريخ — افتح التواريخ أولاً',
        );
      }

      const slots = await this.lockStayNights(
        manager,
        service.id,
        service.providerId,
        nightDates,
        quantity,
        checkInSlot,
      );

      const unitPrice = checkInSlot.customPrice ?? service.basePrice;
      const totalAmount = roundMoney(unitPrice * quantity * stayNights);
      const depositPercentage = Number(
        service.depositPercentage ?? DEFAULT_DEPOSIT_PERCENTAGE,
      );
      // Paid in full at desk — nothing remaining online.
      const depositAmount = totalAmount;
      const remainingAmount = 0;
      const commissionAmount = roundMoney(
        (totalAmount * commissionPercentage) / 100,
      );

      for (const slot of slots) {
        slot.availableCapacity -= quantity;
        if (slot.availableCapacity === 0) {
          slot.status = AvailabilityStatus.SOLD_OUT;
        }
        await manager.save(slot);
      }

      const booking = manager.create(Booking, {
        bookingNumber: this.nextBookingNumber(),
        customerId: null,
        providerId: service.providerId,
        serviceId: service.id,
        availabilityId: checkInSlot.id,
        bookingDate: checkInDate,
        checkOutDate: checkOut,
        startTime: checkInSlot.startTime,
        endTime: checkInSlot.endTime,
        quantity,
        totalAmount,
        depositPercentage,
        depositAmount,
        remainingAmount,
        commissionPercentage,
        commissionAmount,
        customerNotes: buildDeskNotes(dto, stayNights),
        status: BookingStatus.CONFIRMED,
        temporaryLockUntil: null,
      });
      return manager.save(booking);
    });
  }

  async mine(user: User) {
    if (user.role === UserRole.PROVIDER) {
      return this.bookings.find({
        where: { provider: { userId: user.id } },
        relations: ['service', 'provider', 'availability', 'customer'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.bookings.find({
      where: { customerId: user.id },
      relations: ['service', 'provider', 'availability', 'review'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(user: User, id: string) {
    const booking = await this.bookings.findOne({
      where: { id },
      relations: [
        'service',
        'provider',
        'availability',
        'payments',
        'customer',
        'review',
      ],
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
    return this.dataSource.transaction(async (manager) =>
      this.transitionWithManager(manager, bookingId, to),
    );
  }

  /**
   * Row-locked status change. Call inside an existing transaction when composing
   * multi-step admin/payment flows so expire/confirm cannot race.
   */
  async transitionWithManager(
    manager: EntityManager,
    bookingId: string,
    to: BookingStatus,
  ) {
    const booking = await manager
      .createQueryBuilder(Booking, 'b')
      .setLock('pessimistic_write')
      .leftJoinAndSelect('b.availability', 'availability')
      .where('b.id = :id', { id: bookingId })
      .getOne();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === to) {
      return booking;
    }
    if (!canTransition(booking.status, to)) {
      throw new BadRequestException(
        `Cannot move booking from ${booking.status} to ${to}`,
      );
    }

    if (
      (to === BookingStatus.CANCELLED || to === BookingStatus.EXPIRED) &&
      booking.serviceId
    ) {
      await this.releaseStayNights(manager, booking);
      booking.temporaryLockUntil = null;
    }

    if (to === BookingStatus.CONFIRMED || to === BookingStatus.REFUNDED) {
      booking.temporaryLockUntil = null;
    }

    booking.status = to;
    return manager.save(booking);
  }

  async expirePendingLocks() {
    // Only soft-hold bookings (still mid-checkout). Payment-submitted
    // PENDING_PAYMENT rows have temporaryLockUntil = null and must stay.
    const now = new Date();
    const due = await this.bookings
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BookingStatus.PENDING_PAYMENT })
      .andWhere('b.temporaryLockUntil IS NOT NULL')
      .andWhere('b.temporaryLockUntil <= :now', { now })
      .orderBy('b.temporaryLockUntil', 'ASC')
      .take(50)
      .getMany();

    const expired: string[] = [];
    for (const booking of due) {
      try {
        // Each transition takes FOR UPDATE; concurrent expire workers skip via canTransition.
        await this.dataSource.transaction(async (manager) => {
          const locked = await manager
            .createQueryBuilder(Booking, 'b')
            .setLock('pessimistic_partial_write')
            .where('b.id = :id', { id: booking.id })
            .getOne();
          if (
            !locked ||
            locked.status !== BookingStatus.PENDING_PAYMENT ||
            !locked.temporaryLockUntil ||
            locked.temporaryLockUntil > new Date()
          ) {
            return;
          }
          await this.transitionWithManager(
            manager,
            locked.id,
            BookingStatus.EXPIRED,
          );
          expired.push(locked.id);
        });
      } catch {
        // Another worker confirmed/expired this row — safe to skip.
      }
    }
    return { expired: expired.length, ids: expired };
  }

  /** Clear the soft hold after the customer starts/submits payment. */
  async clearTemporaryLock(bookingId: string) {
    const booking = await this.bookings.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (
      booking.status === BookingStatus.PENDING_PAYMENT &&
      booking.temporaryLockUntil
    ) {
      booking.temporaryLockUntil = null;
      await this.bookings.save(booking);
    }
    return booking;
  }

  /** Admin confirms bank transfer / cash proof → CONFIRMED. */
  async confirmPayment(user: User, bookingId: string) {
    const booking = await this.findOneForUser(user, bookingId);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin only');
    }
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Booking is not awaiting payment confirmation');
    }
    return this.transition(bookingId, BookingStatus.CONFIRMED);
  }

  private nextBookingNumber() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `BK-${stamp}-${rand}`;
  }

  /**
   * Load + validate capacity for every night on this service and sibling
   * packages of the same facility (shared unit inventory).
   */
  private async lockStayNights(
    manager: EntityManager,
    serviceId: string,
    providerId: string,
    nightDates: string[],
    quantity: number,
    checkInSlot: ServiceAvailability,
  ): Promise<ServiceAvailability[]> {
    const siblings = await manager.find(ServiceItem, {
      where: { providerId, status: RecordStatus.ACTIVE },
      select: ['id'],
    });
    const serviceIds = siblings.length
      ? siblings.map((s) => s.id)
      : [serviceId];

    const slots: ServiceAvailability[] = [];
    for (const sid of serviceIds) {
      for (const date of nightDates) {
        let slot: ServiceAvailability | null = null;
        if (sid === serviceId && date === toDateKey(checkInSlot.date)) {
          slot = checkInSlot;
        } else {
          slot = await manager
            .createQueryBuilder(ServiceAvailability, 'slot')
            .setLock('pessimistic_write')
            .where('slot.service_id = :serviceId', { serviceId: sid })
            .andWhere('slot.date = :date', { date })
            .andWhere('slot.start_time IS NULL')
            .getOne();
        }

        if (!slot && sid === serviceId && checkInSlot.startTime) {
          slot = await manager
            .createQueryBuilder(ServiceAvailability, 'slot')
            .setLock('pessimistic_write')
            .where('slot.service_id = :serviceId', { serviceId: sid })
            .andWhere('slot.date = :date', { date })
            .andWhere('slot.start_time = :start', {
              start: checkInSlot.startTime,
            })
            .getOne();
        }

        // Sibling packages without a calendar row — skip (not opened yet).
        if (!slot) {
          if (sid === serviceId) {
            throw new BadRequestException(
              `لا يوجد توفر لتاريخ ${date} — اختر نطاقاً آخر`,
            );
          }
          continue;
        }
        if (slot.status !== AvailabilityStatus.AVAILABLE) {
          throw new BadRequestException(`التاريخ ${date} غير متاح`);
        }
        if (slot.availableCapacity < quantity) {
          throw new BadRequestException(`لا تكفي السعة لتاريخ ${date}`);
        }
        slots.push(slot);
      }
    }
    return slots;
  }

  private async releaseStayNights(
    manager: EntityManager,
    booking: Booking,
  ) {
    if (!booking.serviceId) return;
    const checkOut =
      booking.checkOutDate ??
      parseCheckOutFromNotes(booking.customerNotes) ??
      null;
    const nightDates = eachBlockedDate(booking.bookingDate, checkOut);
    const quantity = booking.quantity ?? 1;

    const providerId =
      booking.providerId ??
      (
        await manager.findOne(ServiceItem, {
          where: { id: booking.serviceId },
          select: ['providerId'],
        })
      )?.providerId;

    const serviceIds = new Set<string>([booking.serviceId]);
    if (providerId) {
      const siblings = await manager.find(ServiceItem, {
        where: { providerId, status: RecordStatus.ACTIVE },
        select: ['id'],
      });
      for (const s of siblings) serviceIds.add(s.id);
    }

    for (const sid of serviceIds) {
      for (const date of nightDates) {
        let slot: ServiceAvailability | null = null;
        if (
          sid === booking.serviceId &&
          booking.availabilityId &&
          date === toDateKey(booking.bookingDate)
        ) {
          slot = await manager
            .createQueryBuilder(ServiceAvailability, 'slot')
            .setLock('pessimistic_write')
            .where('slot.id = :id', { id: booking.availabilityId })
            .getOne();
        }
        if (!slot) {
          slot = await manager
            .createQueryBuilder(ServiceAvailability, 'slot')
            .setLock('pessimistic_write')
            .where('slot.service_id = :serviceId', { serviceId: sid })
            .andWhere('slot.date = :date', { date })
            .andWhere('slot.start_time IS NULL')
            .getOne();
        }
        if (!slot) continue;
        slot.availableCapacity += quantity;
        if (slot.availableCapacity > slot.totalCapacity) {
          slot.availableCapacity = slot.totalCapacity;
        }
        if (
          slot.status === AvailabilityStatus.SOLD_OUT &&
          slot.availableCapacity > 0
        ) {
          slot.status = AvailabilityStatus.AVAILABLE;
        }
        await manager.save(slot);
      }
    }
  }
}

function parseCheckOutFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const m = /المغادرة:\s*(\d{4}-\d{2}-\d{2})/.exec(notes);
  return m?.[1] ?? null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function timeToMinutes(raw?: string | null): number | null {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(raw).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function findPricePeriodForSlot(
  service: ServiceItem,
  slot: ServiceAvailability,
): Record<string, unknown> | null {
  const attrs = (service.attributes ?? {}) as Record<string, unknown>;
  const periods = Array.isArray(attrs.pricePeriods) ? attrs.pricePeriods : [];
  if (!periods.length) return null;
  const t = timeToMinutes(slot.startTime);
  if (t == null) return null;
  for (const raw of periods) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const from = timeToMinutes(
      typeof p.fromTime === 'string' ? p.fromTime : null,
    );
    const to = timeToMinutes(typeof p.toTime === 'string' ? p.toTime : null);
    if (from == null || to == null) continue;
    const inBand = to > from ? t >= from && t < to : t >= from || t < to;
    if (inBand) return p;
  }
  return null;
}

/** When price periods are configured, reject hours outside those windows. */
function assertSlotWithinPricePeriods(
  service: ServiceItem,
  slot: ServiceAvailability,
) {
  const attrs = (service.attributes ?? {}) as Record<string, unknown>;
  const periods = Array.isArray(attrs.pricePeriods) ? attrs.pricePeriods : [];
  if (!periods.length || !slot.startTime) return;
  if (!findPricePeriodForSlot(service, slot)) {
    throw new BadRequestException(
      'هذا الوقت خارج فترات العمل المحددة للمنشأة',
    );
  }
}

/** Resolve hourly price from service.attributes.pricePeriods for sports fields. */
function unitPriceForSlot(
  service: ServiceItem,
  slot: ServiceAvailability,
): number {
  if (slot.customPrice != null && Number.isFinite(Number(slot.customPrice))) {
    return Number(slot.customPrice);
  }
  const hit = findPricePeriodForSlot(service, slot);
  if (hit) {
    const price = Number(hit.pricePerHour ?? hit.price);
    if (Number.isFinite(price)) return price;
  }
  return Number(service.basePrice) || 0;
}

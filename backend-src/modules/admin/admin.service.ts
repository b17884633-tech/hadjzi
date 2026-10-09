import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccountStatus,
  BookingStatus,
  DisputeStatus,
  PaymentStatus,
  PaymentType,
  ProviderStatus,
  RecordStatus,
  UserRole,
} from '../../common/enums';
import { DEFAULT_DEPOSIT_PERCENTAGE } from '../../common/constants/booking.constants';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Booking } from '../booking/entities/booking.entity';
import { ServiceItem } from '../services/entities/service-item.entity';
import { Category } from '../categories/entities/category.entity';
import { City } from '../search/entities/city.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { AppNotification } from './entities/notification.entity';
import {
  AdminCreateNotificationDto,
  AdminSetPaymentStatusDto,
  AdminSetProviderStatusDto,
  AdminSetUserStatusDto,
  AdminUpdateProviderDto,
  AdminUpdateSettingsDto,
  AdminUpdateUserDto,
} from './dto/admin.dto';

const DEPOSIT_KEY = 'default_deposit_percentage';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Provider) private readonly providers: Repository<Provider>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Dispute) private readonly disputes: Repository<Dispute>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(ServiceItem) private readonly services: Repository<ServiceItem>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(City) private readonly cities: Repository<City>,
    @InjectRepository(PlatformSetting)
    private readonly settings: Repository<PlatformSetting>,
    @InjectRepository(AppNotification)
    private readonly notifications: Repository<AppNotification>,
  ) {}

  async overview() {
    await this.ensurePaymentsForPendingBookings();
    const [
      facilitiesTotal,
      facilitiesPending,
      facilitiesApproved,
      facilitiesSuspended,
      usersTotal,
      usersActive,
      usersPending,
      usersSuspended,
      complaintsOpen,
      complaintsReview,
      complaintsResolved,
      paymentsInitiated,
      paymentsFailed,
      categoriesTotal,
      categoriesActive,
      noticesTotal,
      depositPercentage,
    ] = await Promise.all([
      this.providers.count(),
      this.providers.count({ where: { status: ProviderStatus.PENDING_REVIEW } }),
      this.providers.count({ where: { status: ProviderStatus.APPROVED } }),
      this.providers.count({ where: { status: ProviderStatus.SUSPENDED } }),
      this.users.count(),
      this.users.count({ where: { status: AccountStatus.ACTIVE } }),
      this.users.count({ where: { status: AccountStatus.PENDING_VERIFICATION } }),
      this.users.count({ where: { status: AccountStatus.SUSPENDED } }),
      this.disputes.count({ where: { status: DisputeStatus.OPEN } }),
      this.disputes.count({ where: { status: DisputeStatus.UNDER_REVIEW } }),
      this.disputes.count({ where: { status: DisputeStatus.RESOLVED } }),
      this.payments.count({ where: { status: PaymentStatus.INITIATED } }),
      this.payments.count({ where: { status: PaymentStatus.FAILED } }),
      this.categories.count(),
      this.categories.count({ where: { status: RecordStatus.ACTIVE } }),
      this.notifications.count(),
      this.getDepositPercentage(),
    ]);

    const moneyRows = await this.payments.find({
      where: { status: PaymentStatus.SUCCESS },
      select: ['amount', 'paymentType', 'createdAt'],
    });

    let collected = 0;
    let refunded = 0;
    const monthly = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly.set(key, 0);
    }
    for (const row of moneyRows) {
      const amount = Number(row.amount);
      if (row.paymentType === PaymentType.REFUND) refunded += amount;
      else collected += amount;
      const created = new Date(row.createdAt);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      if (monthly.has(key)) {
        monthly.set(
          key,
          (monthly.get(key) ?? 0) +
            (row.paymentType === PaymentType.REFUND ? -amount : amount),
        );
      }
    }

    const pendingAmountRows = await this.payments.find({
      where: { status: PaymentStatus.INITIATED },
      select: ['amount'],
    });
    const pendingAmount = pendingAmountRows.reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );

    const recentPayments = await this.payments.find({
      relations: ['customer', 'booking', 'booking.provider'],
      order: { createdAt: 'DESC' },
      take: 8,
    });

    return {
      stats: {
        netCollected: roundMoney(collected - refunded),
        collected: roundMoney(collected),
        refunded: roundMoney(refunded),
        pendingAmount: roundMoney(pendingAmount),
        facilitiesTotal,
        facilitiesPending,
        facilitiesApproved,
        facilitiesSuspended,
        usersTotal,
        usersActive,
        usersPending,
        usersSuspended,
        complaintsOpen,
        complaintsReview,
        complaintsResolved,
        paymentsInitiated,
        paymentsFailed,
        categoriesTotal,
        categoriesActive,
        categoriesBlocked: categoriesTotal - categoriesActive,
        noticesTotal,
        depositPercentage,
      },
      pending: {
        facilities: facilitiesPending > 0,
        users: usersPending > 0,
        complaints: complaintsOpen > 0,
        wallet: paymentsInitiated > 0,
      },
      monthlyCollections: [...monthly.entries()].map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        const label = new Date(year, month - 1, 1).toLocaleString('en-GB', {
          month: 'short',
        });
        return { key, label, value: roundMoney(value) };
      }),
      recentPayments: recentPayments.map((payment) => this.mapPayment(payment)),
    };
  }

  private readonly providerRelations = [
    'category',
    'city',
    'region',
    'user',
    'services',
  ] as const;

  async listProviders() {
    const rows = await this.providers.find({
      relations: [...this.providerRelations],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.mapProvider(row));
  }

  async updateProvider(id: string, dto: AdminUpdateProviderDto) {
    const provider = await this.providers.findOne({
      where: { id },
      relations: [...this.providerRelations],
    });
    if (!provider) throw new NotFoundException('Facility not found');

    if (dto.businessName !== undefined) provider.businessName = dto.businessName.trim();
    if (dto.description !== undefined) provider.description = dto.description;
    if (dto.addressDetails !== undefined) provider.addressDetails = dto.addressDetails;
    if (dto.categoryId !== undefined) {
      if (dto.categoryId != null) {
        const category = await this.categories.findOneBy({ id: dto.categoryId });
        if (!category) throw new BadRequestException('Category not found');
      }
      provider.categoryId = dto.categoryId;
    }
    if (dto.cityId !== undefined) {
      if (dto.cityId != null) {
        const city = await this.cities.findOneBy({ id: dto.cityId });
        if (!city) throw new BadRequestException('City not found');
      }
      provider.cityId = dto.cityId;
    }

    await this.providers.save(provider);
    const refreshed = await this.providers.findOne({
      where: { id },
      relations: [...this.providerRelations],
    });
    return this.mapProvider(refreshed!);
  }

  async setProviderStatus(id: string, dto: AdminSetProviderStatusDto, actor?: User) {
    const provider = await this.providers.findOne({
      where: { id },
      relations: [...this.providerRelations],
    });
    if (!provider) throw new NotFoundException('Facility not found');
    if (
      dto.status === ProviderStatus.APPROVED &&
      provider.categoryId != null
    ) {
      const category = await this.categories.findOneBy({ id: provider.categoryId });
      if (category?.status === RecordStatus.INACTIVE) {
        throw new BadRequestException(
          'Cannot approve a facility in a blocked category',
        );
      }
    }

    const previous = provider.status;
    provider.status = dto.status;
    const attrs = {
      ...(provider.attributes ?? {}),
    } as Record<string, unknown>;
    if (dto.status === ProviderStatus.SUSPENDED) {
      attrs.disabledBy = 'ADMIN';
      delete attrs.disableReason;
      attrs.disabledAt = new Date().toISOString();
    } else if (
      dto.status === ProviderStatus.APPROVED ||
      dto.status === ProviderStatus.PENDING_REVIEW
    ) {
      delete attrs.disabledBy;
      delete attrs.disableReason;
      delete attrs.disabledAt;
    }
    provider.attributes = attrs;
    await this.providers.save(provider);

    if (previous !== dto.status) {
      await this.notifyFacilityStatus(provider, dto.status, actor?.id ?? null);
    }

    const refreshed = await this.providers.findOne({
      where: { id },
      relations: [...this.providerRelations],
    });
    return this.mapProvider(refreshed!);
  }

  private async notifyFacilityStatus(
    provider: Provider,
    status: ProviderStatus,
    createdBy: string | null,
  ) {
    const copy = facilityStatusNotice(provider.businessName, status);
    await this.notifications.save(
      this.notifications.create({
        title: copy.title,
        message: copy.message,
        audience: 'USER',
        kind: 'FACILITY_STATUS',
        userId: provider.userId,
        providerId: provider.id,
        createdBy,
        readAt: null,
      }),
    );
  }

  async listUsers() {
    const rows = await this.users.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.mapUser(row));
  }

  async updateUser(id: string, dto: AdminUpdateUserDto, actor: User) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');

    if (dto.phone && dto.phone !== user.phone) {
      const taken = await this.users.findOne({ where: { phone: dto.phone } });
      if (taken) throw new ConflictException('Phone already registered');
      user.phone = dto.phone;
    }
    if (dto.email !== undefined) {
      const email = dto.email?.trim() || null;
      if (email) {
        const taken = await this.users.findOne({ where: { email } });
        if (taken && taken.id !== id) {
          throw new ConflictException('Email already registered');
        }
      }
      user.email = email;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.role !== undefined) {
      if (id === actor.id && dto.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Cannot remove your own admin role');
      }
      user.role = dto.role;
    }

    await this.users.save(user);
    return this.mapUser(user);
  }

  async setUserStatus(id: string, dto: AdminSetUserStatusDto, actor: User) {
    if (id === actor.id && dto.status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Cannot block your own account');
    }
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    user.status = dto.status;
    if (dto.status === AccountStatus.ACTIVE) {
      user.phoneVerified = true;
    }
    await this.users.save(user);
    return this.mapUser(user);
  }

  async listDisputes() {
    const rows = await this.disputes.find({
      relations: ['raiser', 'booking', 'booking.provider'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.mapDispute(row));
  }

  async resolveDispute(
    id: string,
    status: DisputeStatus,
    resolution?: string,
  ) {
    const dispute = await this.disputes.findOne({
      where: { id },
      relations: ['raiser', 'booking', 'booking.provider'],
    });
    if (!dispute) throw new NotFoundException('Complaint not found');
    if (
      (status === DisputeStatus.RESOLVED || status === DisputeStatus.REJECTED) &&
      !(resolution ?? dispute.resolution)?.trim()
    ) {
      throw new BadRequestException('Resolution is required');
    }
    dispute.status = status;
    if (resolution !== undefined) dispute.resolution = resolution;
    await this.disputes.save(dispute);
    return this.mapDispute(dispute);
  }

  async listPayments() {
    await this.ensurePaymentsForPendingBookings();
    const rows = await this.payments.find({
      relations: ['customer', 'booking', 'booking.provider'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.mapPayment(row));
  }

  /**
   * Bookings created with payment proof before payment rows existed still need
   * an INITIATED payment so Wallet can confirm them.
   */
  private async ensurePaymentsForPendingBookings() {
    const pending = await this.bookings.find({
      where: { status: BookingStatus.PENDING_PAYMENT },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    if (!pending.length) return;

    for (const booking of pending) {
      const existing = await this.payments.findOne({
        where: { bookingId: booking.id },
      });
      if (existing) continue;

      const notes = booking.customerNotes ?? '';
      const methodMatch = notes.match(/طريقة الدفع:\s*([A-Za-z0-9_]+)/);
      const refMatch = notes.match(/رقم الحوالة:\s*([^|]+)/);
      const payFull = /وضع الدفع:\s*FULL/i.test(notes);
      const method = (methodMatch?.[1] ?? 'TRANSFER').trim().slice(0, 50);
      const transferRef = refMatch?.[1]?.trim().slice(0, 100) || null;
      const amount = payFull
        ? Number(booking.totalAmount)
        : Number(booking.depositAmount);

      await this.payments.save(
        this.payments.create({
          bookingId: booking.id,
          customerId: booking.customerId,
          amount,
          paymentType: PaymentType.DEPOSIT,
          paymentMethod: method || 'TRANSFER',
          gatewayTransactionId: transferRef,
          status: PaymentStatus.INITIATED,
          idempotencyKey: `booking-submit-${booking.id}`,
          paidAt: null,
        }),
      );
    }
  }

  async setPaymentStatus(id: string, dto: AdminSetPaymentStatusDto) {
    const payment = await this.payments.findOne({
      where: { id },
      relations: ['customer', 'booking', 'booking.provider'],
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.SUCCESS && dto.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('A successful payment cannot be reverted');
    }
    payment.status = dto.status;
    payment.paidAt = dto.status === PaymentStatus.SUCCESS ? new Date() : null;
    await this.payments.save(payment);

    if (
      dto.status === PaymentStatus.SUCCESS &&
      payment.bookingId &&
      payment.paymentType !== PaymentType.REFUND
    ) {
      await this.bookings.update(payment.bookingId, {
        status: BookingStatus.CONFIRMED,
      });
    }

    return this.mapPayment(payment);
  }

  async refundPayment(id: string) {
    const source = await this.payments.findOne({
      where: { id },
      relations: ['customer', 'booking', 'booking.provider'],
    });
    if (!source) throw new NotFoundException('Payment not found');
    if (source.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }
    if (source.paymentType === PaymentType.REFUND) {
      throw new BadRequestException('This payment is already a refund');
    }

    const relatedKey = `refund-of:${source.id}`;
    const already = await this.payments.findOne({
      where: { gatewayTransactionId: relatedKey },
    });
    if (already) {
      throw new BadRequestException('A refund was already recorded for this payment');
    }

    const refund = this.payments.create({
      bookingId: source.bookingId,
      customerId: source.customerId,
      amount: source.amount,
      paymentType: PaymentType.REFUND,
      paymentMethod: source.paymentMethod,
      gatewayTransactionId: relatedKey,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
      idempotencyKey: `refund-${source.id}`,
    });
    const saved = await this.payments.save(refund);
    if (source.bookingId) {
      await this.bookings.update(source.bookingId, {
        status: BookingStatus.REFUNDED,
      });
    }
    const full = await this.payments.findOne({
      where: { id: saved.id },
      relations: ['customer', 'booking', 'booking.provider'],
    });
    return this.mapPayment(full!);
  }

  async getSettings() {
    return {
      depositPercentage: await this.getDepositPercentage(),
    };
  }

  async updateSettings(dto: AdminUpdateSettingsDto) {
    const value = roundMoney(dto.depositPercentage);
    await this.settings.save({
      key: DEPOSIT_KEY,
      value,
    });
    await this.services
      .createQueryBuilder()
      .update(ServiceItem)
      .set({ depositPercentage: value })
      .execute();
    return { depositPercentage: value };
  }

  async getDepositPercentage(): Promise<number> {
    const row = await this.settings.findOneBy({ key: DEPOSIT_KEY });
    const raw = row?.value;
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num) ? num : DEFAULT_DEPOSIT_PERCENTAGE;
  }

  async listNotifications() {
    const rows = await this.notifications.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.mapNotice(row));
  }

  async listMine(user: User) {
    const audiences = ['ALL'] as string[];
    if (user.role === UserRole.CUSTOMER) audiences.push('CUSTOMERS');
    if (user.role === UserRole.PROVIDER || user.role === UserRole.ADMIN) {
      audiences.push('PROVIDERS');
    }

    const rows = await this.notifications
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.provider', 'provider')
      .where('(n.audience IN (:...audiences) OR n.user_id = :userId)', {
        audiences,
        userId: user.id,
      })
      .orderBy('n.createdAt', 'DESC')
      .take(100)
      .getMany();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.message,
      kind: row.kind || 'GENERAL',
      providerId: row.providerId,
      providerName: row.provider?.businessName ?? null,
      createdAt: row.createdAt,
      read: Boolean(row.readAt),
    }));
  }

  async markMineRead(user: User, id?: string) {
    const audiences = ['ALL'] as string[];
    if (user.role === UserRole.CUSTOMER) audiences.push('CUSTOMERS');
    if (user.role === UserRole.PROVIDER || user.role === UserRole.ADMIN) {
      audiences.push('PROVIDERS');
    }

    const qb = this.notifications
      .createQueryBuilder()
      .update(AppNotification)
      .set({ readAt: () => 'NOW()' })
      .where('read_at IS NULL')
      .andWhere('(audience IN (:...audiences) OR user_id = :userId)', {
        audiences,
        userId: user.id,
      });

    if (id) {
      qb.andWhere('id = :id', { id });
    }

    await qb.execute();
    return { ok: true };
  }

  async createNotification(dto: AdminCreateNotificationDto, actor: User) {
    if (dto.audience === 'USER') {
      if (!dto.userId) throw new BadRequestException('userId is required');
      const user = await this.users.findOneBy({ id: dto.userId });
      if (!user) throw new NotFoundException('User not found');
    } else if (dto.userId) {
      throw new BadRequestException('userId is only valid for USER audience');
    }

    const saved = await this.notifications.save(
      this.notifications.create({
        title: dto.title.trim(),
        message: dto.message.trim(),
        audience: dto.audience,
        kind: 'GENERAL',
        userId: dto.audience === 'USER' ? dto.userId! : null,
        createdBy: actor.id,
        readAt: null,
      }),
    );
    const full = await this.notifications.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    return this.mapNotice(full!);
  }

  async listCities() {
    return this.cities.find({
      where: { status: RecordStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async listCategories() {
    const rows = await this.categories.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      iconUrl: row.iconUrl,
      parentId: row.parentId,
      bookingType: row.bookingType,
      sortOrder: row.sortOrder,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    };
  }

  private mapProvider(provider: Provider) {
    const attrs = (provider.attributes ?? {}) as Record<string, unknown>;
    return {
      id: provider.id,
      businessName: provider.businessName,
      categoryId: provider.categoryId,
      categoryName: provider.category?.name ?? null,
      ownerId: provider.userId,
      ownerName: provider.user
        ? `${provider.user.firstName} ${provider.user.lastName}`.trim()
        : null,
      ownerPhone: provider.user?.phone ?? null,
      cityId: provider.cityId,
      city: provider.city?.name ?? null,
      regionId: provider.regionId,
      region: provider.region?.name ?? null,
      address: provider.addressDetails,
      description: provider.description,
      latitude: provider.latitude,
      longitude: provider.longitude,
      cancellationPolicy: provider.cancellationPolicy,
      attributes: attrs,
      spaces: stringList(attrs.spaces),
      amenities: stringList(attrs.amenities),
      terms: stringList(attrs.terms),
      depositNote:
        typeof attrs.depositNote === 'string' ? attrs.depositNote : null,
      tourUrl: typeof attrs.tourUrl === 'string' ? attrs.tourUrl : null,
      bedrooms: numberOrNull(attrs.bedrooms ?? attrs.rooms),
      bathrooms: numberOrNull(attrs.bathrooms),
      majlis: numberOrNull(attrs.majlis),
      insuranceAmount: numberOrNull(attrs.insuranceAmount),
      insuranceMeta:
        typeof attrs.insuranceMeta === 'string' ? attrs.insuranceMeta : null,
      insuranceNote:
        typeof attrs.insuranceNote === 'string' ? attrs.insuranceNote : null,
      disabledBy:
        attrs.disabledBy === 'ADMIN' || attrs.disabledBy === 'PROVIDER'
          ? attrs.disabledBy
          : null,
      disableReason:
        typeof attrs.disableReason === 'string' ? attrs.disableReason : null,
      status: provider.status,
      images: provider.images ?? [],
      services: (provider.services ?? []).map((service) => ({
        id: service.id,
        name: service.name,
        basePrice: Number(service.basePrice),
        depositPercentage: Number(service.depositPercentage),
        status: service.status,
        images: service.images ?? [],
      })),
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }

  private mapNotice(row: AppNotification) {
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      audience: row.audience,
      kind: row.kind,
      userId: row.userId,
      userName: row.user
        ? `${row.user.firstName} ${row.user.lastName}`.trim()
        : null,
      providerId: row.providerId,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  private mapDispute(dispute: Dispute) {
    const raw = dispute.reason?.trim() || '';
    const facilityDisable = parseFacilityDisableComplaint(raw);
    const reason = facilityDisable?.message ?? raw;
    const facilityName =
      facilityDisable?.facilityName ??
      dispute.booking?.provider?.businessName ??
      null;
    return {
      id: dispute.id,
      bookingId: dispute.bookingId,
      bookingNumber: dispute.booking?.bookingNumber ?? null,
      facilityName,
      userId: dispute.raisedBy,
      userName: dispute.raiser
        ? `${dispute.raiser.firstName} ${dispute.raiser.lastName}`.trim()
        : null,
      subject: facilityDisable
        ? 'Facility disabled by provider'
        : reason
          ? reason.slice(0, 80)
          : dispute.bookingId
            ? 'Booking complaint'
            : 'General feedback',
      message: reason,
      status: dispute.status,
      resolution: dispute.resolution,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    };
  }

  private mapPayment(payment: Payment) {
    const gatewayId = payment.gatewayTransactionId;
    const isRefundLink = gatewayId?.startsWith('refund-of:') ?? false;
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      bookingNumber: payment.booking?.bookingNumber ?? null,
      userId: payment.customerId,
      userName: payment.customer
        ? `${payment.customer.firstName} ${payment.customer.lastName}`.trim()
        : null,
      facilityName: payment.booking?.provider?.businessName ?? null,
      amount: Number(payment.amount),
      type: payment.paymentType,
      method: payment.paymentMethod,
      status: payment.status,
      reference: !isRefundLink && gatewayId ? gatewayId : null,
      relatedPaymentId: isRefundLink
        ? gatewayId!.slice('refund-of:'.length)
        : null,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
    };
  }

}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** `[FACILITY_DISABLE:uuid] Name\nreason` from provider self-disable. */
function parseFacilityDisableComplaint(raw: string): {
  facilityName: string | null;
  message: string;
} | null {
  const m = raw.match(/^\[FACILITY_DISABLE:[^\]]+\]\s*([^\n]*)\n?([\s\S]*)$/);
  if (!m) return null;
  const facilityName = m[1]?.trim() || null;
  const message = (m[2] ?? '').trim() || facilityName || raw;
  return { facilityName, message };
}

function facilityStatusNotice(businessName: string, status: ProviderStatus) {
  const name = businessName.trim() || 'منشأتك';
  switch (status) {
    case ProviderStatus.APPROVED:
      return {
        title: 'تم قبول منشأتك',
        message: `تمت الموافقة على «${name}» وأصبحت ظاهرة للعملاء على حجزي.`,
      };
    case ProviderStatus.REJECTED:
      return {
        title: 'تم رفض منشأتك',
        message: `تم رفض «${name}». راجع بيانات المنشأة وأعد الإرسال بعد التصحيح.`,
      };
    case ProviderStatus.SUSPENDED:
      return {
        title: 'تم إيقاف منشأتك',
        message: `تم إيقاف «${name}» من الإدارة ولن تظهر في البحث حتى يعيد الأدمن تفعيلها.`,
      };
    case ProviderStatus.PENDING_REVIEW:
    default:
      return {
        title: 'منشأتك قيد المراجعة',
        message: `تم وضع «${name}» في قائمة المراجعة من قبل الإدارة.`,
      };
  }
}

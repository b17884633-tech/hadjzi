import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../../common/enums';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { User } from '../../users/entities/user.entity';
import { Provider } from '../../providers/entities/provider.entity';
import { ServiceItem } from '../../services/entities/service-item.entity';
import { ServiceAvailability } from '../../services/entities/service-availability.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Dispute } from '../../disputes/entities/dispute.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_number', length: 30, unique: true })
  bookingNumber: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string | null;

  @Column({ name: 'service_id', type: 'uuid', nullable: true })
  serviceId: string | null;

  @Column({ name: 'availability_id', type: 'uuid', nullable: true })
  availabilityId: string | null;

  @Column({ name: 'booking_date', type: 'date' })
  bookingDate: string;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;

  @Column({ default: 1 })
  quantity: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAmount: number;

  @Column({
    name: 'deposit_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  depositPercentage: number;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  depositAmount: number;

  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  remainingAmount: number;

  @Column({
    name: 'commission_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  commissionPercentage: number;

  @Column({
    name: 'commission_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  commissionAmount: number;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes: string | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.PENDING_PAYMENT,
  })
  status: BookingStatus;

  @Column({ name: 'temporary_lock_until', type: 'timestamptz', nullable: true })
  temporaryLockUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.bookings, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User | null;

  @ManyToOne(() => Provider, (provider) => provider.bookings, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'provider_id' })
  provider?: Provider | null;

  @ManyToOne(() => ServiceItem, (service) => service.bookings, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceItem | null;

  @ManyToOne(() => ServiceAvailability, (availability) => availability.bookings, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'availability_id' })
  availability?: ServiceAvailability | null;

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments?: Payment[];

  @OneToOne(() => Review, (review) => review.booking)
  review?: Review;

  @OneToMany(() => Dispute, (dispute) => dispute.booking)
  disputes?: Dispute[];
}

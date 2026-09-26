import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RecordStatus } from '../../../common/enums';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Provider } from '../../providers/entities/provider.entity';
import { Category } from '../../categories/entities/category.entity';
import { ServiceAvailability } from './service-availability.entity';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('services')
export class ServiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  basePrice: number;

  @Column({
    name: 'deposit_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 20,
    transformer: decimalTransformer,
  })
  depositPercentage: number;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, unknown>;

  @Column({ type: 'text', array: true, default: '{}' })
  images: string[];

  @Column({
    type: 'enum',
    enum: RecordStatus,
    enumName: 'record_status',
    default: RecordStatus.ACTIVE,
  })
  status: RecordStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Provider, (provider) => provider.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'provider_id' })
  provider?: Provider;

  @ManyToOne(() => Category, (category) => category.services, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category | null;

  @OneToMany(() => ServiceAvailability, (availability) => availability.service)
  availabilities?: ServiceAvailability[];

  @OneToMany(() => Booking, (booking) => booking.service)
  bookings?: Booking[];
}

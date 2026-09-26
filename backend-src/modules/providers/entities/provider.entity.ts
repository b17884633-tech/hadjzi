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
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { ProviderStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { City } from '../../search/entities/city.entity';
import { Region } from '../../search/entities/region.entity';
import { ServiceItem } from '../../services/entities/service-item.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'business_name', length: 150 })
  businessName: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'city_id', type: 'int', nullable: true })
  cityId: number | null;

  @Column({ name: 'region_id', type: 'int', nullable: true })
  regionId: number | null;

  @Column({ name: 'address_details', type: 'text', nullable: true })
  addressDetails: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
    transformer: decimalTransformer,
  })
  latitude: number | null;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
    transformer: decimalTransformer,
  })
  longitude: number | null;

  @Column({ type: 'text', array: true, default: '{}' })
  images: string[];

  @Column({ name: 'cancellation_policy', type: 'text', nullable: true })
  cancellationPolicy: string | null;

  @Column({
    type: 'enum',
    enum: ProviderStatus,
    enumName: 'provider_status',
    default: ProviderStatus.PENDING_REVIEW,
  })
  status: ProviderStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Category, (category) => category.providers, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category | null;

  @ManyToOne(() => City, (city) => city.providers, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'city_id' })
  city?: City | null;

  @ManyToOne(() => Region, (region) => region.providers, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'region_id' })
  region?: Region | null;

  @OneToMany(() => ServiceItem, (service) => service.provider)
  services?: ServiceItem[];

  @OneToMany(() => Booking, (booking) => booking.provider)
  bookings?: Booking[];

  @OneToMany(() => Review, (review) => review.provider)
  reviews?: Review[];
}

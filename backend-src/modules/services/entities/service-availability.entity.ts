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
import { AvailabilityStatus } from '../../../common/enums';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { ServiceItem } from './service-item.entity';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('service_availabilities')
export class ServiceAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string | null;

  @Column({ name: 'total_capacity', default: 1 })
  totalCapacity: number;

  @Column({ name: 'available_capacity', default: 1 })
  availableCapacity: number;

  @Column({
    name: 'custom_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  customPrice: number | null;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    enumName: 'availability_status',
    default: AvailabilityStatus.AVAILABLE,
  })
  status: AvailabilityStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => ServiceItem, (service) => service.availabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceItem;

  @OneToMany(() => Booking, (booking) => booking.availability)
  bookings?: Booking[];
}

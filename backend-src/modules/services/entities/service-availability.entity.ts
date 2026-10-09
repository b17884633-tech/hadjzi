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

  /**
   * Stored as PG DATE. TypeORM often hydrates as local-midnight Date, which
   * serializes to the previous UTC calendar day (e.g. UTC+3 → T21:00Z).
   */
  @Column({
    type: 'date',
    transformer: {
      to: (value: string | Date | null | undefined) => {
        if (value == null) return value;
        if (typeof value === 'string') return value.slice(0, 10);
        return new Date(value.getTime() + 12 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      },
      from: (value: string | Date | null | undefined) => {
        if (value == null) return value as unknown as string;
        if (typeof value === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
          if (/^\d{4}-\d{2}-\d{2}/.test(value) && !value.includes('T')) {
            return value.slice(0, 10);
          }
        }
        const d = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
        return new Date(d.getTime() + 12 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      },
    },
  })
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

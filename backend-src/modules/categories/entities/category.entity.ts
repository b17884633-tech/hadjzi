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
import { BookingType, RecordStatus } from '../../../common/enums';
import { Provider } from '../../providers/entities/provider.entity';
import { ServiceItem } from '../../services/entities/service-item.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'icon_url', length: 255 })
  iconUrl: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @Column({
    name: 'booking_type',
    type: 'enum',
    enum: BookingType,
    enumName: 'booking_type',
  })
  bookingType: BookingType;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

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

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children?: Category[];

  @OneToMany(() => Provider, (provider) => provider.category)
  providers?: Provider[];

  @OneToMany(() => ServiceItem, (service) => service.category)
  services?: ServiceItem[];
}

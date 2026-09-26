import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BannerActionType } from '../../../common/enums';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string | null;

  @Column({ name: 'image_url', length: 255 })
  imageUrl: string;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: BannerActionType,
    enumName: 'banner_action_type',
    nullable: true,
  })
  actionType: BannerActionType | null;

  @Column({ name: 'action_target', type: 'varchar', length: 255, nullable: true })
  actionTarget: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

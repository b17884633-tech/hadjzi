import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Provider } from './provider.entity';

@Entity('provider_offers')
export class ProviderOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId: string;

  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  discountPercent: number;

  @Column({ name: 'starts_on', type: 'date' })
  startsOn: string;

  @Column({ name: 'ends_on', type: 'date' })
  endsOn: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Provider, (p) => p.offers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider?: Provider;
}

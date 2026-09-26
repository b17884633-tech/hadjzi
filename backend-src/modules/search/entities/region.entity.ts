import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { City } from './city.entity';
import { Provider } from '../../providers/entities/provider.entity';

@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'city_id' })
  cityId: number;

  @Column({ length: 100 })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => City, (city) => city.regions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city?: City;

  @OneToMany(() => Provider, (provider) => provider.region)
  providers?: Provider[];
}

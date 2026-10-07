import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceItem } from './entities/service-item.entity';
import { ServiceAvailability } from './entities/service-availability.entity';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ProvidersModule } from '../providers/providers.module';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceItem, ServiceAvailability, PlatformSetting]),
    ProvidersModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService, TypeOrmModule],
})
export class ServicesModule {}

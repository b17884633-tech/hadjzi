import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { ProviderOffer } from './entities/provider-offer.entity';
import { MedicalSpecialty } from './entities/medical-specialty.entity';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { UsersModule } from '../users/users.module';
import { Dispute } from '../disputes/entities/dispute.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      ProviderOffer,
      MedicalSpecialty,
      Dispute,
    ]),
    UsersModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}

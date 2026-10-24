import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicePushToken } from './entities/device-push-token.entity';
import { User } from '../users/entities/user.entity';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DevicePushToken, User])],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}

import { Body, Controller, Post, Put } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PushService } from './push.service';

class RegisterPushTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(255)
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;
}

class ClearPushTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  token?: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Register / refresh this device's Expo push token for the logged-in user. */
  @Put('token')
  register(@CurrentUser() user: User, @Body() dto: RegisterPushTokenDto) {
    return this.push.upsertToken(user.id, dto.token, dto.platform);
  }

  /** Clear token(s) on logout — only this user's tokens. */
  @Post('token/clear')
  clear(@CurrentUser() user: User, @Body() dto: ClearPushTokenDto) {
    return this.push.clearToken(user.id, dto.token);
  }
}

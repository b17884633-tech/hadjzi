import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderStatus, UserRole } from '../../common/enums';
import { IsBoolean, IsEnum } from 'class-validator';

class ReviewProviderBody {
  @IsEnum([
    ProviderStatus.APPROVED,
    ProviderStatus.REJECTED,
    ProviderStatus.SUSPENDED,
  ])
  status: ProviderStatus;
}

class SetEnabledBody {
  @IsBoolean()
  enabled: boolean;
}

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateProviderDto) {
    return this.providers.createForUser(user.id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('me')
  me(@CurrentUser() user: User) {
    return this.providers.listMine(user.id);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('me/:id')
  mineOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.providers.findOwned(user.id, id);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch('me/:id')
  updateOwned(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.providers.updateOwned(user.id, id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch('me/:id/enabled')
  setEnabled(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: SetEnabledBody,
  ) {
    return this.providers.setEnabled(user.id, id, body.enabled);
  }

  /** Legacy: updates the first facility. Prefer PATCH /providers/me/:id */
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateProviderDto) {
    return this.providers.updateMine(user.id, dto);
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.providers.findPublic(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  review(@Param('id') id: string, @Body() body: ReviewProviderBody) {
    return this.providers.review(id, body.status);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import {
  CreateAvailabilityDto,
  CreateServiceDto,
  SeedAvailabilityDto,
  SeedHourlyAvailabilityDto,
  UpdateAvailabilityStatusDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { Public } from '../../common/decorators/public.decorator';

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateServiceDto) {
    return this.services.create(user.id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('mine')
  mine(@CurrentUser() user: User, @Query('providerId') providerId?: string) {
    return this.services.listMine(user.id, providerId);
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.services.findPublic(id);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(user.id, id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.services.remove(user.id, id);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post(':id/availabilities')
  addAvailability(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.services.addAvailability(user.id, id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch(':id/availabilities/:availabilityId/status')
  updateAvailabilityStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('availabilityId') availabilityId: string,
    @Body() dto: UpdateAvailabilityStatusDto,
  ) {
    return this.services.updateAvailabilityStatus(
      user.id,
      id,
      availabilityId,
      dto.status,
    );
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post(':id/availabilities/seed')
  seedAvailabilities(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SeedAvailabilityDto,
  ) {
    return this.services.seedAvailabilities(user.id, id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post(':id/availabilities/seed-hourly')
  seedHourlyAvailabilities(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SeedHourlyAvailabilityDto,
  ) {
    return this.services.seedHourlyAvailabilities(user.id, id, dto);
  }
}

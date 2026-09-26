import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateAvailabilityDto, CreateServiceDto } from './dto/service.dto';
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
  mine(@CurrentUser() user: User) {
    return this.services.listMine(user.id);
  }

  @Public()
  @Get(':id')
  one(@Param('id') id: string) {
    return this.services.findPublic(id);
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
}

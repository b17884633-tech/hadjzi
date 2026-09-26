import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingStatus, UserRole } from '../../common/enums';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.bookings.mine(user);
  }

  @Get(':id')
  one(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookings.findOneForUser(user, id);
  }

  @Patch(':id/cancel')
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    await this.bookings.findOneForUser(user, id);
    return this.bookings.transition(id, BookingStatus.CANCELLED);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch(':id/complete')
  async complete(@CurrentUser() user: User, @Param('id') id: string) {
    await this.bookings.findOneForUser(user, id);
    return this.bookings.transition(id, BookingStatus.COMPLETED);
  }
}

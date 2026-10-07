import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { AdminService } from './admin.service';

@Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
@Controller('notifications')
export class UserNotificationsController {
  constructor(private readonly admin: AdminService) {}

  @Get('me')
  listMine(@CurrentUser() user: User) {
    return this.admin.listMine(user);
  }

  @Patch('me/read')
  markAllRead(@CurrentUser() user: User) {
    return this.admin.markMineRead(user);
  }

  @Patch('me/:id/read')
  markOneRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.markMineRead(user, id);
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisputeStatus, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import {
  AdminCreateNotificationDto,
  AdminSetPaymentStatusDto,
  AdminSetProviderStatusDto,
  AdminSetUserStatusDto,
  AdminUpdateProviderDto,
  AdminUpdateSettingsDto,
  AdminUpdateUserDto,
} from './dto/admin.dto';
import { ResolveDisputeDto } from '../disputes/dto/dispute.dto';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('cities')
  cities() {
    return this.admin.listCities();
  }

  @Get('categories')
  categories() {
    return this.admin.listCategories();
  }

  @Get('providers')
  providers() {
    return this.admin.listProviders();
  }

  @Patch('providers/:id')
  updateProvider(@Param('id') id: string, @Body() dto: AdminUpdateProviderDto) {
    return this.admin.updateProvider(id, dto);
  }

  @Patch('providers/:id/status')
  setProviderStatus(
    @Param('id') id: string,
    @Body() dto: AdminSetProviderStatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.admin.setProviderStatus(id, dto, actor);
  }

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() actor: User,
  ) {
    return this.admin.updateUser(id, dto, actor);
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param('id') id: string,
    @Body() dto: AdminSetUserStatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.admin.setUserStatus(id, dto, actor);
  }

  @Get('disputes')
  disputes() {
    return this.admin.listDisputes();
  }

  @Patch('disputes/:id')
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.admin.resolveDispute(id, dto.status as DisputeStatus, dto.resolution);
  }

  @Get('payments')
  payments() {
    return this.admin.listPayments();
  }

  @Patch('payments/:id/status')
  setPaymentStatus(
    @Param('id') id: string,
    @Body() dto: AdminSetPaymentStatusDto,
  ) {
    return this.admin.setPaymentStatus(id, dto);
  }

  @Post('payments/:id/refund')
  refundPayment(@Param('id') id: string) {
    return this.admin.refundPayment(id);
  }

  @Get('settings')
  settings() {
    return this.admin.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: AdminUpdateSettingsDto) {
    return this.admin.updateSettings(dto);
  }

  @Get('notifications')
  notifications() {
    return this.admin.listNotifications();
  }

  @Post('notifications')
  createNotification(
    @Body() dto: AdminCreateNotificationDto,
    @CurrentUser() actor: User,
  ) {
    return this.admin.createNotification(dto, actor);
  }
}

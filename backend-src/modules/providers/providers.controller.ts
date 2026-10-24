import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import {
  CreateProviderOfferDto,
  UpdateProviderOfferDto,
} from './dto/provider-offer.dto';
import { CreateMedicalSpecialtyDto } from './dto/medical-specialty.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderStatus, UserRole } from '../../common/enums';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  /** Required when disabling — why the provider is hiding the facility. */
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateProviderDto) {
    return this.providers.createForUser(user.id, dto);
  }

  /** Any logged-in user — customers get [] until they create a facility. */
  @Get('me')
  me(@CurrentUser() user: User) {
    return this.providers.listMine(user.id);
  }

  /** Must be before :id so the path is not treated as a UUID. */
  @Public()
  @Get('offers/active')
  listActiveOffers() {
    return this.providers.listActiveOfferFacilities();
  }

  /** Must be before :id so the path is not treated as a UUID. */
  @Public()
  @Get('medical-specialties')
  listMedicalSpecialties() {
    return this.providers.listMedicalSpecialties();
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post('medical-specialties')
  createMedicalSpecialty(@Body() dto: CreateMedicalSpecialtyDto) {
    return this.providers.ensureMedicalSpecialty(dto.name);
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
    return this.providers.setEnabled(user.id, id, body.enabled, body.reason);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('me/:id/offers')
  listOffers(@CurrentUser() user: User, @Param('id') id: string) {
    return this.providers.listOffersOwned(user.id, id);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post('me/:id/offers')
  createOffer(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateProviderOfferDto,
  ) {
    return this.providers.createOfferOwned(user.id, id, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Patch('me/:id/offers/:offerId')
  updateOffer(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
    @Body() dto: UpdateProviderOfferDto,
  ) {
    return this.providers.updateOfferOwned(user.id, id, offerId, dto);
  }

  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Delete('me/:id/offers/:offerId')
  deleteOffer(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('offerId') offerId: string,
  ) {
    return this.providers.deleteOfferOwned(user.id, id, offerId);
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

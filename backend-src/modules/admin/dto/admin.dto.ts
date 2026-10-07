import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AccountStatus,
  PaymentStatus,
  ProviderStatus,
  UserRole,
} from '../../../common/enums';
import type { NotificationAudience } from '../entities/notification.entity';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class AdminSetUserStatusDto {
  @IsEnum(AccountStatus)
  status: AccountStatus;
}

export class AdminUpdateProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  cityId?: number | null;

  @IsOptional()
  @IsString()
  addressDetails?: string | null;
}

export class AdminSetProviderStatusDto {
  @IsEnum([
    ProviderStatus.APPROVED,
    ProviderStatus.REJECTED,
    ProviderStatus.SUSPENDED,
    ProviderStatus.PENDING_REVIEW,
  ])
  status: ProviderStatus;
}

export class AdminSetPaymentStatusDto {
  @IsEnum([PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.INITIATED])
  status: PaymentStatus;
}

export class AdminUpdateSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage: number;
}

export class AdminCreateNotificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(2)
  message: string;

  @IsEnum(['ALL', 'CUSTOMERS', 'PROVIDERS', 'USER'])
  audience: NotificationAudience;

  @IsOptional()
  @IsUUID('loose')
  userId?: string;
}

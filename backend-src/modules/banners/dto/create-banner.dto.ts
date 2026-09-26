import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { BannerActionType } from '../../../common/enums';

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsEnum(BannerActionType)
  actionType?: BannerActionType;

  @IsOptional()
  @IsString()
  actionTarget?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

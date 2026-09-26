import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { OtpChannel } from '../../../common/enums';

export class RegisterDto {
  @IsString()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MaxLength(50)
  lastName: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/)
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;
}

export class LoginDto {
  @IsString()
  phone: string;

  @IsString()
  password: string;
}

export class SendOtpDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;
}

export class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  code: string;
}

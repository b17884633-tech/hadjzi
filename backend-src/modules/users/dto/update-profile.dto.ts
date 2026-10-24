import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  /** users.email is VARCHAR(100) UNIQUE — validate here so bad input is a 400, not a 500. */
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;
}

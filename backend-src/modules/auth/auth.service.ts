import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { LoginDto, RegisterDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { AccountStatus, OtpChannel, OtpPurpose } from '../../common/enums';
import { JwtPayload } from './jwt.strategy';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.createCustomer({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      password: dto.password,
    });
    const otp = await this.otp.issue(
      user.phone,
      OtpPurpose.REGISTER,
      dto.channel ?? OtpChannel.SMS,
    );
    return {
      user: this.sanitize(user),
      otp,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }
    if (!user.phoneVerified) {
      const otp = await this.otp.issue(user.phone, OtpPurpose.LOGIN);
      return { requiresOtp: true, otp };
    }
    return this.issueTokens(user);
  }

  async sendOtp(dto: SendOtpDto) {
    return this.otp.issue(
      dto.phone,
      OtpPurpose.VERIFY_PHONE,
      dto.channel ?? OtpChannel.SMS,
    );
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.users.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const purposes = [OtpPurpose.REGISTER, OtpPurpose.LOGIN, OtpPurpose.VERIFY_PHONE];
    let consumed = false;
    let lastError: unknown;
    for (const purpose of purposes) {
      try {
        await this.otp.consume(dto.phone, dto.code, purpose);
        consumed = true;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!consumed) {
      throw lastError instanceof Error
        ? lastError
        : new UnauthorizedException('Invalid OTP');
    }
    const verified = await this.users.markPhoneVerified(user.id);
    return this.issueTokens(verified);
  }

  private issueTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      phone: user.phone,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.sanitize(user),
    };
  }

  private sanitize(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}

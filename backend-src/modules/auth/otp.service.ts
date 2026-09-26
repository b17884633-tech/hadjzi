import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { OtpCode } from './entities/otp-code.entity';
import { OtpChannel, OtpPurpose } from '../../common/enums';
import { ConsoleSmsAdapter } from './messaging/console-sms.adapter';
import { ConsoleWhatsappAdapter } from './messaging/console-whatsapp.adapter';
import { MessagingAdapter } from './messaging/messaging.adapter';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    private readonly sms: ConsoleSmsAdapter,
    private readonly whatsapp: ConsoleWhatsappAdapter,
    private readonly config: ConfigService,
  ) {}

  async issue(
    phone: string,
    purpose: OtpPurpose,
    channel: OtpChannel = OtpChannel.SMS,
  ): Promise<{ expiresAt: Date; devCode?: string }> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const minutes = Number(this.config.get('OTP_EXPIRES_MINUTES') ?? 5);
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const row = this.otpRepo.create({
      phone,
      codeHash,
      channel,
      purpose,
      expiresAt,
    });
    await this.otpRepo.save(row);

    const adapter = this.adapter(channel);
    await adapter.send(phone, `رمز التحقق الخاص بك هو ${code}`);

    const echo = this.config.get('OTP_DEV_ECHO') === 'true';
    return echo ? { expiresAt, devCode: code } : { expiresAt };
  }

  async consume(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
    const latest = await this.otpRepo.findOne({
      where: { phone, purpose, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!latest || latest.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    latest.attempts += 1;
    const ok = await bcrypt.compare(code, latest.codeHash);
    if (!ok) {
      await this.otpRepo.save(latest);
      throw new UnauthorizedException('Invalid OTP');
    }
    if (latest.attempts > 8) {
      throw new BadRequestException('Too many OTP attempts');
    }

    latest.consumedAt = new Date();
    await this.otpRepo.save(latest);
  }

  private adapter(channel: OtpChannel): MessagingAdapter {
    return channel === OtpChannel.WHATSAPP ? this.whatsapp : this.sms;
  }
}

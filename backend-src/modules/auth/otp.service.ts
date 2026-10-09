import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { OtpCode } from './entities/otp-code.entity';
import { OtpChannel, OtpPurpose } from '../../common/enums';
import { MessagingAdapter } from './messaging/messaging.adapter';
import { SMS_ADAPTER, WHATSAPP_ADAPTER } from './messaging/messaging.tokens';

@Injectable()
export class OtpService implements OnModuleInit {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    @Inject(SMS_ADAPTER) private readonly sms: MessagingAdapter,
    @Inject(WHATSAPP_ADAPTER) private readonly whatsapp: MessagingAdapter,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.log(
      `OTP delivery — SMS: ${this.sms.constructor.name}, WhatsApp: ${this.whatsapp.constructor.name}`,
    );
  }

  async issue(
    phone: string,
    purpose: OtpPurpose,
    channel: OtpChannel = OtpChannel.SMS,
  ): Promise<{ expiresAt: Date; devCode?: string }> {
    const cooldownSec = Number(this.config.get('OTP_COOLDOWN_SECONDS') ?? 45);
    const recent = await this.otpRepo.findOne({
      where: {
        phone,
        purpose,
        createdAt: MoreThan(new Date(Date.now() - cooldownSec * 1000)),
      },
      order: { createdAt: 'DESC' },
    });
    if (recent) {
      throw new BadRequestException(
        `Please wait ${cooldownSec} seconds before requesting another code`,
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    // Cost 8: OTP is short-lived; lower than password hashing under load.
    const codeHash = await bcrypt.hash(code, 8);
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
    await adapter.send(phone, `رمز التحقق الخاص بك في حجزي هو ${code}`);

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
    if (latest.attempts > 8) {
      await this.otpRepo.save(latest);
      throw new BadRequestException('Too many OTP attempts');
    }

    const ok = await bcrypt.compare(code, latest.codeHash);
    if (!ok) {
      await this.otpRepo.save(latest);
      throw new UnauthorizedException('Invalid OTP');
    }

    latest.consumedAt = new Date();
    await this.otpRepo.save(latest);
  }

  private adapter(channel: OtpChannel): MessagingAdapter {
    return channel === OtpChannel.WHATSAPP ? this.whatsapp : this.sms;
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './jwt.strategy';
import { OtpCode } from './entities/otp-code.entity';
import { UsersModule } from '../users/users.module';
import { MessagingAdapter } from './messaging/messaging.adapter';
import { ConsoleSmsAdapter } from './messaging/console-sms.adapter';
import { ConsoleWhatsappAdapter } from './messaging/console-whatsapp.adapter';
import { TwilioSmsAdapter } from './messaging/twilio-sms.adapter';
import { TwilioWhatsappAdapter } from './messaging/twilio-whatsapp.adapter';
import { MetaWhatsappAdapter } from './messaging/meta-whatsapp.adapter';
import { SMS_ADAPTER, WHATSAPP_ADAPTER } from './messaging/messaging.tokens';

function hasTwilioSms(config: ConfigService): boolean {
  return Boolean(
    config.get('messaging.twilio.accountSid') &&
      config.get('messaging.twilio.authToken') &&
      config.get('messaging.twilio.smsFrom'),
  );
}

function hasTwilioWhatsapp(config: ConfigService): boolean {
  return Boolean(
    config.get('messaging.twilio.accountSid') &&
      config.get('messaging.twilio.authToken') &&
      config.get('messaging.twilio.whatsappFrom'),
  );
}

function hasMetaWhatsapp(config: ConfigService): boolean {
  return Boolean(
    config.get('messaging.metaWhatsapp.token') &&
      config.get('messaging.metaWhatsapp.phoneNumberId'),
  );
}

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([OtpCode]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiresIn') ??
            '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    ConsoleSmsAdapter,
    ConsoleWhatsappAdapter,
    TwilioSmsAdapter,
    TwilioWhatsappAdapter,
    MetaWhatsappAdapter,
    {
      provide: SMS_ADAPTER,
      inject: [ConfigService, ConsoleSmsAdapter, TwilioSmsAdapter],
      useFactory: (
        config: ConfigService,
        consoleSms: ConsoleSmsAdapter,
        twilioSms: TwilioSmsAdapter,
      ): MessagingAdapter => (hasTwilioSms(config) ? twilioSms : consoleSms),
    },
    {
      provide: WHATSAPP_ADAPTER,
      inject: [
        ConfigService,
        ConsoleWhatsappAdapter,
        MetaWhatsappAdapter,
        TwilioWhatsappAdapter,
      ],
      useFactory: (
        config: ConfigService,
        consoleWa: ConsoleWhatsappAdapter,
        metaWa: MetaWhatsappAdapter,
        twilioWa: TwilioWhatsappAdapter,
      ): MessagingAdapter => {
        if (hasMetaWhatsapp(config)) return metaWa;
        if (hasTwilioWhatsapp(config)) return twilioWa;
        return consoleWa;
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}

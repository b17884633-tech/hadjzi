import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import paymentConfig from './config/payment.config';
import redisConfig from './config/redis.config';
import cloudinaryConfig from './config/cloudinary.config';
import messagingConfig from './config/messaging.config';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ServicesModule } from './modules/services/services.module';
import { SearchModule } from './modules/search/search.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BannersModule } from './modules/banners/banners.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        paymentConfig,
        redisConfig,
        cloudinaryConfig,
        messagingConfig,
      ],
    }),
    // Global ceiling; auth routes override with a stricter @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow('database'),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProvidersModule,
    ServicesModule,
    SearchModule,
    BookingModule,
    PaymentsModule,
    BannersModule,
    ReviewsModule,
    DisputesModule,
    JobsModule,
    HealthModule,
    UploadsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
  ],
})
export class AppModule {}

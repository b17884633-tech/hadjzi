import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { configureTimezone } from './config/timezone.config';

function assertProductionSecrets(): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const logger = new Logger('Bootstrap');
  const jwt = process.env.JWT_SECRET ?? '';
  const weakJwt =
    !jwt ||
    jwt.length < 32 ||
    jwt.includes('change-me') ||
    jwt === 'dev-secret';

  if (weakJwt) {
    throw new Error(
      'JWT_SECRET must be a strong random value (32+ chars) in production',
    );
  }
  if (process.env.OTP_DEV_ECHO === 'true') {
    logger.warn(
      'OTP_DEV_ECHO=true ignored in production — codes will not be returned in API',
    );
    process.env.OTP_DEV_ECHO = 'false';
  }
  if (
    !process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.PAYMENT_WEBHOOK_SECRET.includes('change-me')
  ) {
    logger.warn(
      'PAYMENT_WEBHOOK_SECRET is weak or missing — configure before enabling payment webhooks',
    );
  }
}

function resolveCorsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Always allow the deployed admin + local Vite, plus any extras from env.
  return [
    ...new Set([
      'https://hadjzi-admin.onrender.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...fromEnv,
    ]),
  ];
}

async function bootstrap() {
  configureTimezone();
  assertProductionSecrets();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const allowedOrigins = resolveCorsOrigins();
  new Logger('Bootstrap').log(`CORS origins: ${allowedOrigins.join(', ')}`);

  // CORS before helmet / body parsers so preflight always gets ACAO headers.
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Mobile apps and server-to-server often send no Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-webhook-secret',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Length'],
    maxAge: 86_400,
  });

  app.use(
    helmet({
      // Allow browser clients on another origin (admin dashboard) to call this API.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API listening on http://0.0.0.0:${port}/api`);
}

bootstrap();

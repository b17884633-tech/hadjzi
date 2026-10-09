import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: {
      // Supabase pooler often needs false locally; set DB_SSL_REJECT_UNAUTHORIZED=true in prod when CA is trusted.
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    },
    autoLoadEntities: true,
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
    // Keep pool modest for Supabase / PgBouncer; raise only if host allows.
    extra: {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10_000),
    },
    maxQueryExecutionTime: Number(process.env.DB_SLOW_QUERY_MS ?? 1000),
  }),
);

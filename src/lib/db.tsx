import postgres from 'postgres';
import { validateEnvironment } from './env';

// Fail fast on startup in production if required environment variables are missing
validateEnvironment();

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10;

const sql =
  globalForPostgres.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: poolMax,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    onnotice: (notice) => {
      // Suppress benign PostgreSQL notices (e.g. "already exists, skipping")
      if (
        notice.code === '42701' ||
        notice.code === '42P07' ||
        notice.severity === 'NOTICE' ||
        notice.severity_local === 'NOTICE'
      ) {
        return;
      }
      console.warn(`[postgres notice: ${notice.code}] ${notice.message}`);
    },
  });

// Retain connection across warm serverless invocations and long-lived Node processes
globalForPostgres.sql = sql;

export default sql;
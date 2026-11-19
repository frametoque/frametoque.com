import postgres from 'postgres';
import { validateEnvironment } from './env';

// Fail fast on startup in production if required environment variables are missing
validateEnvironment();

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 30;

const sql =
  globalForPostgres.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: poolMax,
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

// Retain connection across warm serverless invocations
globalForPostgres.sql = sql;

export default sql;
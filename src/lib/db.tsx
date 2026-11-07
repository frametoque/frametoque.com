import postgres from 'postgres';
import { validateEnvironment } from './env';

// Fail fast on startup in production if required environment variables are missing
validateEnvironment();

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

const sql =
  globalForPostgres.sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 30,
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

if (process.env.NODE_ENV !== 'production') globalForPostgres.sql = sql;

export default sql;
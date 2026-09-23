import postgres from 'postgres';

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

const sql =
  globalForPostgres.sql ??
  postgres(process.env.DATABASE_URL!, { prepare: false, max: 30 });

if (process.env.NODE_ENV !== 'production') globalForPostgres.sql = sql;

export default sql;
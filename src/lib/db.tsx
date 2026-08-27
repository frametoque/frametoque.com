import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 30 });

export default sql;
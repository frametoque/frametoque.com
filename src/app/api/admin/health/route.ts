import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getActiveVisitors } from "../../../(dashboard)/admin/actions/analytics";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  let dbStatus = "offline";
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    dbStatus = "online";
  } catch (e) {
    console.error("Database health check failed", e);
  }

  const blobStatus = process.env.BLOB_READ_WRITE_TOKEN ? "online" : "offline";

  const activeVisitors = await getActiveVisitors();

  return NextResponse.json({
    db: dbStatus,
    blob: blobStatus,
    activeVisitors,
  });
}

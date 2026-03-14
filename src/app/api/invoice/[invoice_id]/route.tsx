// app/api/invoice/[invoice_id]/route.js
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET(request, { params }) {
  const { invoice_id } = await params;
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      `SELECT
        invoice_id,
        user_email,
        project_name,
        billing_address,
        date,
        currency,
        description_1, price_1, total_1,
        description_2, price_2, total_2,
        description_3, price_3, total_3,
        description_4, price_4, total_4,
        subtotal,
        discount,
        total,
        advance,
        total_due,
        work_status,
        payment_status
      FROM invoices
      WHERE invoice_id = $1`,
      [invoice_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

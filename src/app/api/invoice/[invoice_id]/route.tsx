import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth, clerkClient } from "@clerk/nextjs/server";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET(request, { params }) {
  const { invoice_id } = await params;
  let client;

  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;
  
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbClient = await pool.connect();

    const result = await dbClient.query(
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
      WHERE invoice_id = $1 AND LOWER(user_email) = LOWER($2)`,
      [invoice_id, userEmail]
    );

    if (result.rows.length === 0) {
      const invoiceExists = await dbClient.query(
        "SELECT user_email FROM invoices WHERE invoice_id = $1",
        [invoice_id]
      );
      
      if (invoiceExists.rows.length > 0) {
        return NextResponse.json(
          { error: "Unauthorized - This invoice does not belong to you" },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
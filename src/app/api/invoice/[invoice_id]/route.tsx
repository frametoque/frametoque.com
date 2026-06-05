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

    const itemsResult = await dbClient.query(
      `SELECT description, price, total, quantity 
       FROM invoice_items 
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [invoice_id]
    );

    const invoice = result.rows[0];
    invoice.items = itemsResult.rows;

    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth, clerkClient } from "@clerk/nextjs/server";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function GET(request, { params }) {
  const { invoice_id } = await params;
  let dbClient;

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

    dbClient = await pool.connect();

   const result = await dbClient.query(
      `SELECT
        i.invoice_id,
        i.user_email,
        i.project_name,
        i.date,
        i.currency,
        i.subtotal,
        i.discount,
        i.total,
        i.advance,
        i.total_due,
        i.work_status,
        i.payment_status,
        i.created_at,
        COALESCE(u.full_name, ac.name, i.user_email) as client_name,
        COALESCE(ac.address, u.address) as billing_address
      FROM public.invoices i
      LEFT JOIN public.admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
      LEFT JOIN public.users u ON LOWER(i.user_email) = LOWER(u.email)
      WHERE i.invoice_id = $1 AND LOWER(i.user_email) = LOWER($2)`,
      [invoice_id, userEmail]
    );

    if (result.rows.length === 0) {
      const invoiceExists = await dbClient.query(
        "SELECT user_email FROM public.invoices WHERE invoice_id = $1",
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

    const invoice = result.rows[0];
    
    // Fetch line items
    const itemsResult = await dbClient.query(
      `SELECT description, price, total, quantity 
       FROM public.invoice_items 
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [invoice_id]
    );
    invoice.items = itemsResult.rows;

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  } finally {
    if (dbClient) dbClient.release();
  }
}
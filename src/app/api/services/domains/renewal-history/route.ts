import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("user_email");
    const domainId = searchParams.get("domain_id");

    if (!userEmail) {
      return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS domain_renewal_history (
          id               SERIAL PRIMARY KEY,
          domain_order_id  INTEGER NOT NULL,
          domain_name      VARCHAR(255) NOT NULL,
          client_email     VARCHAR(255) NOT NULL,
          invoice_id       VARCHAR(100) NOT NULL,
          renewal_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          usd_price        NUMERIC(12, 2) NOT NULL,
          lkr_price        NUMERIC(12, 2) NOT NULL,
          lkr_rate         NUMERIC(10, 4) NOT NULL,
          status           VARCHAR(50) NOT NULL DEFAULT 'unpaid'
        )
      `;
    } catch (e) { /* already exists */ }

    let rows;
    if (domainId) {
      // Validate that the domain belongs to this user
      const ownerCheck = await sql`
        SELECT id FROM admin_domain_orders
        WHERE id = ${parseInt(domainId)} AND LOWER(client_email) = LOWER(${userEmail})
      `;
      if (ownerCheck.length === 0) {
        return NextResponse.json({ error: "Domain not found" }, { status: 404 });
      }

      rows = await sql`
        SELECT h.*, i.payment_status AS invoice_payment_status
        FROM domain_renewal_history h
        LEFT JOIN invoices i ON h.invoice_id = i.invoice_id
        WHERE h.domain_order_id = ${parseInt(domainId)}
          AND LOWER(h.client_email) = LOWER(${userEmail})
        ORDER BY h.renewal_date DESC
      `;
    } else {
      // All renewal history for this user
      rows = await sql`
        SELECT h.*, i.payment_status AS invoice_payment_status
        FROM domain_renewal_history h
        LEFT JOIN invoices i ON h.invoice_id = i.invoice_id
        WHERE LOWER(h.client_email) = LOWER(${userEmail})
        ORDER BY h.renewal_date DESC
      `;
    }

    return NextResponse.json(rows.map((r: any) => ({
      id: r.id,
      domain_order_id: r.domain_order_id,
      domain_name: r.domain_name,
      invoice_id: r.invoice_id,
      renewal_date: r.renewal_date,
      usd_price: parseFloat(r.usd_price || 0),
      lkr_price: parseFloat(r.lkr_price || 0),
      lkr_rate: parseFloat(r.lkr_rate || 0),
      status: r.invoice_payment_status || r.status || 'unpaid',
    })));
  } catch (err: any) {
    console.error("Failed to fetch domain renewal history:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

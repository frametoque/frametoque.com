import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireUserSession, AuthError } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("user_email");
    const domainId = searchParams.get("domain_id");

    if (!userEmail) {
      return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    try {
      await requireUserSession(userEmail);
    } catch (authErr) {
      if (authErr instanceof AuthError) {
        return NextResponse.json({ error: authErr.message }, { status: authErr.statusCode });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }



    let rows;
    if (domainId) {
      // Validate that the domain belongs to this user (supports numeric ID, domain_uid, or domain name)
      const isNum = /^\d+$/.test(domainId);
      const ownerCheck = isNum
        ? await sql`
            SELECT id FROM admin_domain_orders
            WHERE id = ${parseInt(domainId)} AND LOWER(client_email) = LOWER(${userEmail})
          `
        : await sql`
            SELECT id FROM admin_domain_orders
            WHERE (domain_uid = ${domainId} OR LOWER(domain_name) = LOWER(${domainId}))
              AND LOWER(client_email) = LOWER(${userEmail})
          `;
      if (ownerCheck.length === 0) {
        return NextResponse.json({ error: "Domain not found" }, { status: 404 });
      }

      const realDomainId = ownerCheck[0].id;
      rows = await sql`
        SELECT h.*, i.payment_status AS invoice_payment_status
        FROM domain_renewal_history h
        LEFT JOIN invoices i ON h.invoice_id = i.invoice_id
        WHERE h.domain_order_id = ${realDomainId}
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

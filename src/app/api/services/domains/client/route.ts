import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireUserSession } from "@/lib/auth-guard";
import { ensureDomainTables } from "@/lib/domains/migration";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDomainTables();
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("user_email");

    if (!userEmail) {
      return NextResponse.json({ error: "user_email is required" }, { status: 400 });
    }

    // IDOR protection: enforce that session email matches userEmail (or is Admin)
    await requireUserSession(userEmail);

    const rows = await sql`
      SELECT 
        d.id,
        d.domain_uid,
        d.domain_name,
        d.selling_price,
        d.renewal_price,
        d.status,
        d.expiry_date,
        d.created_at,
        d.invoice_id,
        d.activation_lkr_price,
        d.activation_lkr_rate,
        d.renewal_lkr_price,
        d.renewal_lkr_rate,
        d.zone_id,
        COALESCE(d.locked, true) as locked,
        COALESCE(d.auto_renew, false) as auto_renew,
        COALESCE(d.privacy_enabled, true) as privacy_enabled,
        d.nameservers,
        d.dnssec_status,
        d.transfer_status,
        i.payment_status,
        i.total_due,
        i.currency
      FROM admin_domain_orders d
      LEFT JOIN invoices i ON d.invoice_id = i.invoice_id
      WHERE LOWER(d.client_email) = LOWER(${userEmail})
      ORDER BY d.created_at DESC
    `;

    return NextResponse.json(rows);
  } catch (err: any) {
    const status = err.statusCode || 500;
    console.error("Failed to fetch client domains:", err);
    return NextResponse.json({ error: err.message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth-guard";
import { getDomainProvider } from "@/lib/domains/provider";
import { logDomainAudit } from "@/lib/domains/audit";
import { validateDomainName, checkRateLimit } from "@/lib/domains/validation";
import { ensureDomainTables } from "@/lib/domains/migration";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDomainTables();
    const session = await requireUserSession();
    const email = session.email!;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rate = checkRateLimit(`transfer:in:${email}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many transfer requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { domain, auth_code, contacts } = body;

    const val = validateDomainName(domain);
    if (!val.valid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }

    if (!auth_code || typeof auth_code !== "string" || auth_code.trim().length < 3) {
      return NextResponse.json(
        { error: "A valid Auth/EPP Code is required from your current registrar to initiate transfer." },
        { status: 400 }
      );
    }

    const cleanDomain = val.cleanDomain;
    const parts = cleanDomain.split(".");
    const tld = parts[parts.length - 1];

    // Check pricing
    const pricingRows = await sql`
      SELECT * FROM tld_pricing WHERE LOWER(tld) = LOWER(${tld}) LIMIT 1
    `;
    const costPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].cost_price) : 10.46;
    const sellPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].selling_price) : 15.96;
    const profit = sellPrice - costPrice;

    const provider = getDomainProvider();
    const transferResult = await provider.initiateInboundTransfer({
      domain: cleanDomain,
      authCode: auth_code.trim(),
      autoRenew: true,
      privacy: true,
      contacts,
    });

    // Insert order in admin_domain_orders
    const inserted = await sql`
      INSERT INTO admin_domain_orders (
        client_email, domain_name, actual_price, selling_price, profit,
        renewal_cost, renewal_price, registrar, status, transfer_status,
        locked, auto_renew, privacy_enabled
      ) VALUES (
        ${email}, ${cleanDomain}, ${costPrice}, ${sellPrice}, ${profit},
        ${costPrice}, ${sellPrice}, 'Frametoque Global', 'pending', 'transfer_pending',
        true, true, true
      )
      RETURNING id
    `;

    await logDomainAudit(
      email,
      cleanDomain,
      "INITIATE_INBOUND_TRANSFER",
      { auth_code_provided: true, transfer_status: "transfer_pending" },
      ip
    );

    return NextResponse.json({
      success: true,
      order_id: inserted[0].id,
      domain: cleanDomain,
      transfer_status: "transfer_pending",
      message:
        transferResult.message ||
        "Inbound domain transfer request submitted successfully. Please approve the confirmation email sent to the registrant address by your current registrar.",
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}


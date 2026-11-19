import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { logDomainAudit } from "@/lib/domains/audit";
import { validateDomainName, checkRateLimit } from "@/lib/domains/validation";
import { ensureDomainTables } from "@/lib/domains/migration";
import { getSessionUser } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    await ensureDomainTables();
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const rate = checkRateLimit(`domain:order:${email}`, 15, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many order requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { domain, contacts, autoRenew, packageType, customPriceLkr } = body;

    const val = validateDomainName(domain);
    if (!val.valid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }

    const cleanDomain = val.cleanDomain;
    const parts = cleanDomain.split(".");
    const tld = parts[parts.length - 1] || "com";

    // Query TLD pricing table
    const pricingRows = await sql`
      SELECT * FROM tld_pricing WHERE LOWER(tld) = LOWER(${tld}) LIMIT 1
    `;

    const costPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].cost_price) : 10.46;
    const sellPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].selling_price) : 15.96;
    const renewCost = pricingRows.length > 0 ? parseFloat(pricingRows[0].renewal_cost) : costPrice;
    const renewPrice = pricingRows.length > 0 ? parseFloat(pricingRows[0].renewal_price) : sellPrice;
    const profit = parseFloat((sellPrice - costPrice).toFixed(2));
    const provider = pricingRows.length > 0 ? pricingRows[0].provider : (tld === "lk" ? "LK Domain Registry" : "Cloudflare");

    // Generate unique invoice ID
    const existingInv = await sql`SELECT invoice_id FROM invoices WHERE invoice_id LIKE 'INV-%'`;
    const usedIds = existingInv
      .map((row: any) => parseInt(row.invoice_id.replace('INV-', ''), 10))
      .filter((num: number) => !isNaN(num))
      .sort((a: number, b: number) => a - b);
    let nextId = 1;
    for (const num of usedIds) {
      if (num === nextId) nextId++;
      else if (num > nextId) break;
    }
    const invoiceId = `INV-${String(nextId).padStart(5, '0')}`;

    // Compute localized LKR amount with nearest-10 round-up (e.g. 5,305.91 -> 5,310.00)
    let lkrRate = 310;
    try {
      const rateRes = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
      const rateData = await rateRes.json();
      if (rateData?.rates?.LKR) lkrRate = rateData.rates.LKR;
    } catch {
      // fallback
    }
    const roundToNearest10 = (amount: number): number => Math.ceil((amount || 0) / 10) * 10;
    const defaultLkrPrice = roundToNearest10(sellPrice * lkrRate);
    const defaultLkrCost = parseFloat((costPrice * lkrRate).toFixed(2));
    const defaultLkrRenewPrice = roundToNearest10(renewPrice * lkrRate);
    const defaultLkrRenewCost = parseFloat((renewCost * lkrRate).toFixed(2));

    // Handle LK packages and custom price tiers with Frametoque markup
    const isLk = cleanDomain.endsWith(".lk");
    let finalLkrPrice = defaultLkrPrice;
    let finalLkrCost = defaultLkrCost;
    let finalLkrRenewPrice = defaultLkrRenewPrice;
    let finalLkrRenewCost = defaultLkrRenewCost;
    let itemDescription = `1 Year Domain Registration for ${cleanDomain}`;

    const session = await getSessionUser().catch(() => null);
    const isAdmin = session?.isAdmin === true || (user?.publicMetadata?.role as string)?.toLowerCase() === "admin";
    const allowCustomPrice = isAdmin && typeof customPriceLkr === "number" && customPriceLkr > 0;

    if (isLk) {
      if (packageType === "economy") {
        finalLkrCost = 5000;
        finalLkrPrice = allowCustomPrice ? customPriceLkr : 6500;
        finalLkrRenewPrice = finalLkrPrice;
        finalLkrRenewCost = finalLkrCost;
        itemDescription = `1 Year Domain Registration for ${cleanDomain} (Economy Package)`;
      } else if (packageType === "second_level" || cleanDomain.match(/\.(com|org|edu|hotel|web|sch|gov|net)\.lk$/)) {
        finalLkrCost = 1000;
        finalLkrPrice = allowCustomPrice ? customPriceLkr : 2000;
        finalLkrRenewPrice = finalLkrPrice;
        finalLkrRenewCost = finalLkrCost;
        itemDescription = `1 Year Domain Registration for ${cleanDomain} (Second-Level Domain)`;
      } else {
        finalLkrCost = 8000;
        finalLkrPrice = allowCustomPrice ? customPriceLkr : 10000;
        finalLkrRenewPrice = finalLkrPrice;
        finalLkrRenewCost = finalLkrCost;
        itemDescription = `1 Year Domain Registration for ${cleanDomain} (Standard Package - Multi-Extension Reserve)`;
      }
    }

    // 1. Create linked invoice
    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date,
        subtotal, discount, total, advance, total_due,
        work_status, payment_status, currency, category
      ) VALUES (
        ${invoiceId}, ${email},
        ${`Domain Registration: ${cleanDomain}`}, CURRENT_DATE,
        ${finalLkrPrice}, 0, ${finalLkrPrice}, 0, ${finalLkrPrice},
        'pending', 'unpaid', 'LKR', 'Domain'
      )
    `;

    // 2. Create invoice item
    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
      VALUES (${invoiceId}, ${itemDescription}, 1, ${finalLkrPrice}, ${finalLkrPrice})
    `;

    // 3. Create domain order linked to invoice
    const finalSellUsd = parseFloat((finalLkrPrice / lkrRate).toFixed(2));
    const finalCostUsd = parseFloat((finalLkrCost / lkrRate).toFixed(2));
    const finalProfitUsd = parseFloat((finalSellUsd - finalCostUsd).toFixed(2));

    const inserted = await sql`
      INSERT INTO admin_domain_orders (
        client_email, domain_name, actual_price, selling_price, profit,
        renewal_cost, renewal_price, registrar, expiry_date, status,
        locked, auto_renew, privacy_enabled, registrant_contacts,
        invoice_id, activation_lkr_price, activation_lkr_cost, activation_lkr_rate,
        renewal_lkr_price, renewal_lkr_cost, renewal_lkr_rate
      ) VALUES (
        ${email}, ${cleanDomain}, ${finalCostUsd}, ${finalSellUsd}, 
        ${finalProfitUsd}, ${finalCostUsd}, ${finalSellUsd}, ${provider}, null, 'pending',
        true, ${autoRenew ?? false}, true, ${contacts ? JSON.stringify(contacts) : '{}'}::jsonb,
        ${invoiceId}, ${finalLkrPrice}, ${finalLkrCost}, ${lkrRate},
        ${finalLkrRenewPrice}, ${finalLkrRenewCost}, ${lkrRate}
      )
      RETURNING id
    `;

    await logDomainAudit(
      email,
      cleanDomain,
      "CREATE_DOMAIN_ORDER",
      { order_id: inserted[0].id, invoice_id: invoiceId, selling_price: sellPrice }
    );

    await logSystemAction(`Client "${email}" ordered domain: "${cleanDomain}" (Inv: ${invoiceId})`);

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      id: inserted[0].id,
      invoice_id: invoiceId,
      total_due: finalLkrPrice,
      currency: "LKR",
    });
  } catch (err: any) {
    console.error("Failed to place direct domain order:", err);
    return NextResponse.json({ error: err.message || "Failed to order domain." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureDomainTables();
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Domain order ID is required." }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, domain_name, status FROM admin_domain_orders 
      WHERE id = ${id} AND LOWER(client_email) = ${email.toLowerCase()}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Domain order not found or not owned by user." }, { status: 404 });
    }

    const order = rows[0];
    if (order.status?.toLowerCase() !== "pending") {
      return NextResponse.json({ error: "Only pending domain orders can be cancelled." }, { status: 400 });
    }

    await sql`
      DELETE FROM admin_domain_orders
      WHERE id = ${id} AND LOWER(client_email) = ${email.toLowerCase()} AND status = 'pending'
    `;

    await logDomainAudit(
      email,
      order.domain_name,
      "CANCEL_DOMAIN_ORDER",
      { order_id: id }
    );

    await logSystemAction(`Client "${email}" cancelled pending domain order: "${order.domain_name}" (ID: ${id})`);

    return NextResponse.json({ success: true, message: `Domain order for ${order.domain_name} cancelled successfully.` });
  } catch (err: any) {
    console.error("Failed to cancel domain order:", err);
    return NextResponse.json({ error: err.message || "Failed to cancel domain order." }, { status: 500 });
  }
}

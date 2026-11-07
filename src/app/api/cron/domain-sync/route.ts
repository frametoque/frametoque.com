import { NextResponse } from "next/server";
import crypto from "node:crypto";
import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { logDomainAudit } from "@/lib/domains/audit";
import { getDomainProvider } from "@/lib/domains/provider";
import { ensureDomainTables } from "@/lib/domains/migration";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new NextResponse("Cron secret not configured in server environment", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Constant-time timing-safe comparison to prevent timing side-channel attacks
  let isAuthorized = false;
  try {
    const expectedBearer = `Bearer ${cronSecret}`;
    if (authHeader && authHeader.length === expectedBearer.length) {
      if (crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedBearer))) {
        isAuthorized = true;
      }
    }
    if (token && token.length === cronSecret.length) {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret))) {
        isAuthorized = true;
      }
    }
  } catch {
    isAuthorized = false;
  }

  if (!isAuthorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await ensureDomainTables();
    const provider = getDomainProvider();

    // 1. Mark overdue active domains as expired
    const now = new Date().toISOString();
    const expiredRows = await sql`
      UPDATE admin_domain_orders
      SET status = 'expired'
      WHERE status = 'active'
        AND expiry_date IS NOT NULL
        AND expiry_date <= ${now}::timestamptz
      RETURNING id, domain_name, client_email
    `;

    for (const exp of expiredRows) {
      await logDomainAudit(
        exp.client_email,
        exp.domain_name,
        "DOMAIN_AUTO_EXPIRED_CRON",
        { expired_at: now }
      );
      await logSystemAction(`Domain "${exp.domain_name}" marked expired by daily cron`);
    }

    // 2. Scan active domains expiring soon (30, 14, 7 days)
    const upcomingDomains = await sql`
      SELECT id, domain_name, client_email, expiry_date, auto_renew
      FROM admin_domain_orders
      WHERE status = 'active'
        AND expiry_date IS NOT NULL
        AND expiry_date > NOW()
        AND expiry_date <= NOW() + INTERVAL '30 days'
    `;

    const remindersSent = [];

    for (const d of upcomingDomains) {
      const daysLeft = Math.ceil(
        (new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if ([30, 14, 7, 1].includes(daysLeft)) {
        remindersSent.push({ domain: d.domain_name, daysLeft, email: d.client_email });
        await logDomainAudit(
          d.client_email,
          d.domain_name,
          "EXPIRY_REMINDER_TRIGGERED",
          { days_left: daysLeft, expiry_date: d.expiry_date, auto_renew: d.auto_renew }
        );
        await logSystemAction(
          `Domain expiry notice triggered: "${d.domain_name}" expires in ${daysLeft} days (Owner: ${d.client_email})`
        );
      }
    }

    // 3. Realtime TLD Pricing Sync from Cloudflare
    let tldPricingSynced = 0;
    try {
      const tldRows = await sql`SELECT id, tld, markup FROM tld_pricing WHERE is_active = true`;
      for (const row of tldRows) {
        const tld = row.tld.toLowerCase().trim();
        if (tld === "lk") continue;
        const probe = await provider.checkAvailability(`pricing-probe-${tld}.${tld}`);
        if (probe.costPrice && probe.costPrice > 0) {
          const liveCost = Number(probe.costPrice);
          const markup = Number(row.markup) || 5.50;
          await sql`
            UPDATE tld_pricing
            SET cost_price = ${liveCost},
                renewal_cost = ${liveCost},
                selling_price = ${parseFloat((liveCost + markup).toFixed(2))},
                renewal_price = ${parseFloat((liveCost + markup).toFixed(2))},
                updated_at = NOW()
            WHERE id = ${row.id}
          `;
          tldPricingSynced++;
        }
      }
    } catch (e) {
      console.warn("[Cron] TLD live rate sync notice:", e);
    }

    return NextResponse.json({
      success: true,
      autoExpiredCount: expiredRows.length,
      upcomingNoticeCount: upcomingDomains.length,
      tldPricingSynced,
      remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Domain Sync Cron] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


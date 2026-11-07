import { NextRequest, NextResponse } from "next/server";
import { requireDomainOwnership } from "@/lib/domains/auth";
import { getDomainProvider, resolveLiveNameservers } from "@/lib/domains/provider";
import { logDomainAudit, getDomainAuditLogs } from "@/lib/domains/audit";
import { checkRateLimit } from "@/lib/domains/validation";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const provider = getDomainProvider();

    // 1. Live Cloudflare Zone Lookup
    // Checks Cloudflare API directly to find existing real zone & live nameservers
    let zoneId = domain.zone_id;
    let nameservers = domain.nameservers || [];
    let liveZoneInfo: any = null;

    try {
      liveZoneInfo = await provider.getLiveZone(domain.domain_name);
      if (liveZoneInfo) {
        zoneId = liveZoneInfo.zoneId;
        nameservers = liveZoneInfo.nameservers;

        // Auto-update database with real Cloudflare zone details
        await sql`
          UPDATE admin_domain_orders
          SET zone_id = ${zoneId},
              nameservers = ${JSON.stringify(nameservers)}::jsonb,
              cloudflare_sync_at = NOW()
          WHERE id = ${domain.id}
        `.catch((e) => console.warn("[Live Zone DB Sync Error]:", e));
      } else if (!zoneId || zoneId.startsWith("zone-")) {
        const created = await provider.getOrCreateZone(domain.domain_name);
        zoneId = created.zoneId;
        nameservers = created.nameservers;
      }
    } catch (err) {
      console.warn(`[Domain API] Cloudflare live zone lookup notice for ${domain.domain_name}:`, err);
    }

    // 2. Live Cloudflare Registrar Details (Lock, Expiry, Auto-renew, Contacts)
    try {
      const liveReg = await provider.getDomain(domain.domain_name);
      if (liveReg) {
        if (liveReg.expiresAt) domain.expiry_date = liveReg.expiresAt;
        if (liveReg.locked !== undefined) domain.locked = liveReg.locked;
        if (liveReg.autoRenew !== undefined) domain.auto_renew = liveReg.autoRenew;
        if (liveReg.contacts) domain.registrant_contacts = liveReg.contacts;
      }
    } catch (err) {
      console.warn(`[Domain API] Live domain details sync notice:`, err);
    }

    // 3. Live DNSSEC info from Cloudflare
    let dnssecInfo: any = { status: domain.dnssec_status || "disabled" };
    if (zoneId && !zoneId.startsWith("zone-")) {
      try {
        dnssecInfo = await provider.getDnssec(zoneId);
      } catch {
        // Fallback to DB state
      }
    }

    const auditLogs = await getDomainAuditLogs(domain.domain_name, 20);

    const rawNs = nameservers || domain.nameservers;
    let safeNs: string[] = [];
    if (Array.isArray(rawNs) && rawNs.length > 0) {
      const filtered = rawNs
        .filter((item) => typeof item === "string" && item.trim().length > 0)
        .filter((item) => !item.includes("frametoque.com"));
      if (filtered.length > 0) safeNs = filtered;
    } else if (typeof rawNs === "string" && rawNs.trim().length > 0) {
      try {
        const parsed = JSON.parse(rawNs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          safeNs = parsed
            .filter((item) => typeof item === "string" && item.trim().length > 0)
            .filter((item) => !item.includes("frametoque.com"));
        }
      } catch {
        const split = rawNs
          .split(/[,\s\n\r]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && !s.includes("frametoque.com"));
        if (split.length > 0) safeNs = split;
      }
    } else if (rawNs && typeof rawNs === "object") {
      const vals = Object.values(rawNs)
        .map(String)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.includes("frametoque.com"));
      if (vals.length > 0) safeNs = vals;
    }

    if (safeNs.length === 0 && domain.domain_name) {
      const liveNs = await resolveLiveNameservers(domain.domain_name);
      if (liveNs.length > 0) safeNs = liveNs;
    }

    const daysRemaining = domain.expiry_date
      ? Math.ceil((new Date(domain.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      ...domain,
      zone_id: zoneId && !zoneId.startsWith("zone-") ? zoneId : null,
      nameservers: safeNs,
      dnssec_info: dnssecInfo,
      audit_logs: auditLogs,
      is_sandbox: provider.isSandbox,
      live_zone: liveZoneInfo,
      days_remaining: daysRemaining,
      created_on: liveZoneInfo?.createdOn || (domain as any).created_at || (domain as any).date,
      plan_name: liveZoneInfo?.plan || null,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rate = checkRateLimit(`domain:write:${sessionEmail}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many write requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const provider = getDomainProvider();

    // 1. Lock toggle
    if (typeof body.locked === "boolean") {
      await provider.setLock(domain.domain_name, body.locked);
      await sql`
        UPDATE admin_domain_orders SET locked = ${body.locked} WHERE id = ${domain.id}
      `;
      await logDomainAudit(
        sessionEmail,
        domain.domain_name,
        body.locked ? "ENABLE_LOCK" : "DISABLE_LOCK",
        { locked: body.locked },
        ip
      );
    }

    // 2. Auto-renew toggle
    if (typeof body.auto_renew === "boolean") {
      await provider.setAutoRenew(domain.domain_name, body.auto_renew);
      await sql`
        UPDATE admin_domain_orders SET auto_renew = ${body.auto_renew} WHERE id = ${domain.id}
      `;
      await logDomainAudit(
        sessionEmail,
        domain.domain_name,
        body.auto_renew ? "ENABLE_AUTO_RENEW" : "DISABLE_AUTO_RENEW",
        { auto_renew: body.auto_renew },
        ip
      );
    }

    return NextResponse.json({ success: true, message: "Domain settings updated successfully." });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}


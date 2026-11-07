import { NextRequest, NextResponse } from "next/server";
import { requireDomainOwnership } from "@/lib/domains/auth";
import { getDomainProvider } from "@/lib/domains/provider";
import { logDomainAudit } from "@/lib/domains/audit";
import { checkRateLimit } from "@/lib/domains/validation";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain } = await requireDomainOwnership(id);
    const provider = getDomainProvider();

    let zoneId = domain.zone_id;
    if (!zoneId) {
      const zoneInfo = await provider.getOrCreateZone(domain.domain_name);
      zoneId = zoneInfo.zoneId;
      await sql`
        UPDATE admin_domain_orders
        SET zone_id = ${zoneId}, nameservers = ${JSON.stringify(zoneInfo.nameservers)}::jsonb
        WHERE id = ${domain.id}
      `;
    }

    const dnssecInfo = await provider.getDnssec(zoneId);

    return NextResponse.json({
      locked: domain.locked ?? true,
      auto_renew: domain.auto_renew ?? false,
      privacy: {
        status: "Enabled, protected by Frametoque Digital",
        redacted: true,
        notice: "WHOIS privacy protection is permanently active and included with your Frametoque Digital domain registration.",
      },
      dnssec: dnssecInfo,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rate = checkRateLimit(`security:write:${sessionEmail}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const provider = getDomainProvider();
    const zoneId = domain.zone_id || "mock-zone";

    // 1. Lock toggle
    if (typeof body.locked === "boolean") {
      await provider.setLock(domain.domain_name, body.locked);
      await sql`
        UPDATE admin_domain_orders SET locked = ${body.locked} WHERE id = ${domain.id}
      `;
      await logDomainAudit(
        sessionEmail,
        domain.domain_name,
        body.locked ? "ENABLE_REGISTRAR_LOCK" : "DISABLE_REGISTRAR_LOCK",
        { locked: body.locked },
        ip
      );
    }

    // 2. DNSSEC toggle
    if (typeof body.dnssec_enabled === "boolean") {
      const dnssecRes = await provider.setDnssec(zoneId, body.dnssec_enabled);
      const newStatus = dnssecRes.status || (body.dnssec_enabled ? "active" : "disabled");
      await sql`
        UPDATE admin_domain_orders SET dnssec_status = ${newStatus} WHERE id = ${domain.id}
      `;
      await logDomainAudit(
        sessionEmail,
        domain.domain_name,
        body.dnssec_enabled ? "ENABLE_DNSSEC" : "DISABLE_DNSSEC",
        { dnssec: dnssecRes },
        ip
      );
      return NextResponse.json({
        success: true,
        locked: domain.locked,
        dnssec: dnssecRes,
        message: `DNSSEC has been ${body.dnssec_enabled ? "enabled" : "disabled"}.`,
      });
    }

    return NextResponse.json({
      success: true,
      locked: body.locked,
      message: "Security settings updated successfully.",
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}


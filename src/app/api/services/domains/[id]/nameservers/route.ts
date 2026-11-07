import { NextRequest, NextResponse } from "next/server";
import { requireDomainOwnership } from "@/lib/domains/auth";
import { getDomainProvider, resolveLiveNameservers } from "@/lib/domains/provider";
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

    let finalNs: string[] = [];
    if (domain.nameservers && Array.isArray(domain.nameservers) && domain.nameservers.length > 0) {
      finalNs = domain.nameservers.filter((s: string) => typeof s === "string" && !s.includes("frametoque.com"));
    }

    if (finalNs.length === 0 && zoneId && !zoneId.startsWith("zone-")) {
      const nsInfo = await provider.getNameservers(zoneId);
      if (nsInfo?.nameservers && Array.isArray(nsInfo.nameservers)) {
        finalNs = nsInfo.nameservers.filter((s: string) => !s.includes("frametoque.com"));
      }
    }

    if (finalNs.length === 0 && domain.domain_name) {
      finalNs = await resolveLiveNameservers(domain.domain_name);
    }

    return NextResponse.json({
      nameservers: finalNs,
      canCustomise: false,
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

    const rate = checkRateLimit(`ns:write:${sessionEmail}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { nameservers } = body;

    if (!Array.isArray(nameservers) || nameservers.length < 2) {
      return NextResponse.json(
        { error: "At least two valid nameserver hostnames are required (e.g. ns1.example.com, ns2.example.com)." },
        { status: 400 }
      );
    }

    const provider = getDomainProvider();
    const zoneId = domain.zone_id || "mock-zone";

    // Attempt to set custom NS via Cloudflare Provider (returns documented restriction notice)
    const result = await provider.setCustomNameservers(zoneId, nameservers);

    await logDomainAudit(
      sessionEmail,
      domain.domain_name,
      "REQUEST_CUSTOM_NAMESERVERS",
      { requested_nameservers: nameservers, notice: result.notice },
      ip
    );

    return NextResponse.json({
      success: result.success,
      error: result.error,
      notice: result.notice,
      status: "manual_provider_support",
      message:
        "External nameserver assignment is managed via Frametoque Digital Anycast policy. Authoritative Anycast nameservers are required to guarantee DDoS mitigation and DNSSEC integrity.",
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}


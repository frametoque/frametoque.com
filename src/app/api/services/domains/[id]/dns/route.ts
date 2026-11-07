import { NextRequest, NextResponse } from "next/server";
import { requireDomainOwnership } from "@/lib/domains/auth";
import { getDomainProvider } from "@/lib/domains/provider";
import { logDomainAudit } from "@/lib/domains/audit";
import { validateDnsRecordInput, checkRateLimit } from "@/lib/domains/validation";
import { ensureDomainTables } from "@/lib/domains/migration";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * List DNS Records
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain } = await requireDomainOwnership(id);
    const provider = getDomainProvider();

    await ensureDomainTables();

    // Ensure Zone ID exists
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

    const isLiveZone = zoneId && !zoneId.startsWith("zone-");

    // For live Cloudflare zones, Cloudflare API is the single source of truth
    if (isLiveZone) {
      const liveRecords = await provider.listDnsRecords(zoneId, domain.domain_name);
      return NextResponse.json({ records: liveRecords, zone_id: zoneId });
    }

    // Fallback for mock/sandbox test zones only
    const dbRecords = await sql`
      SELECT id, type, name, content, ttl, proxied, priority, is_deleted
      FROM domain_custom_dns_records
      WHERE domain_id = ${domain.id}
    `;

    const customActiveRecords: any[] = [];
    for (const r of dbRecords) {
      if (!r.is_deleted) {
        customActiveRecords.push({
          id: r.id,
          zone_id: zoneId,
          type: r.type,
          name: r.name,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied,
          priority: r.priority,
          proxiable: ["A", "AAAA", "CNAME"].includes(r.type.toUpperCase()),
        });
      }
    }

    return NextResponse.json({ records: customActiveRecords, zone_id: zoneId });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

/**
 * Create DNS Record or Apply Quick Template
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    await ensureDomainTables();

    const rate = checkRateLimit(`dns:write:${sessionEmail}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many DNS changes. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
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

    // Support quick-setup template
    if (body.template) {
      const templateName = String(body.template).toLowerCase();
      const createdRecords: any[] = [];

      let templateList: any[] = [];
      if (templateName === "google-workspace") {
        templateList = [
          { type: "MX", name: "@", content: "aspmx.l.google.com", priority: 1, ttl: 3600 },
          { type: "MX", name: "@", content: "alt1.aspmx.l.google.com", priority: 5, ttl: 3600 },
          { type: "MX", name: "@", content: "alt2.aspmx.l.google.com", priority: 5, ttl: 3600 },
          { type: "MX", name: "@", content: "alt3.aspmx.l.google.com", priority: 10, ttl: 3600 },
          { type: "MX", name: "@", content: "alt4.aspmx.l.google.com", priority: 10, ttl: 3600 },
          { type: "TXT", name: "@", content: "v=spf1 include:_spf.google.com ~all", ttl: 3600 },
        ];
      } else if (templateName === "zoho-mail") {
        templateList = [
          { type: "MX", name: "@", content: "mx.zoho.com", priority: 10, ttl: 3600 },
          { type: "MX", name: "@", content: "mx2.zoho.com", priority: 20, ttl: 3600 },
          { type: "MX", name: "@", content: "mx3.zoho.com", priority: 50, ttl: 3600 },
          { type: "TXT", name: "@", content: "v=spf1 include:zoho.com ~all", ttl: 3600 },
        ];
      } else if (templateName === "vercel") {
        templateList = [
          { type: "A", name: "@", content: "76.76.21.21", proxied: false, ttl: 60 },
          { type: "CNAME", name: "www", content: "cname.vercel-dns.com", proxied: false, ttl: 60 },
        ];
      } else if (templateName === "github-pages") {
        templateList = [
          { type: "A", name: "@", content: "185.199.108.153", proxied: false, ttl: 3600 },
          { type: "A", name: "@", content: "185.199.109.153", proxied: false, ttl: 3600 },
          { type: "A", name: "@", content: "185.199.110.153", proxied: false, ttl: 3600 },
          { type: "A", name: "@", content: "185.199.111.153", proxied: false, ttl: 3600 },
        ];
      } else {
        return NextResponse.json({ error: "Unknown template specified." }, { status: 400 });
      }

      for (const rec of templateList) {
        const res = await provider.createDnsRecord(zoneId, rec as any);
        await sql`
          INSERT INTO domain_custom_dns_records (
            id, domain_id, type, name, content, ttl, proxied, priority, is_deleted
          ) VALUES (
            ${res.id}, ${domain.id}, ${res.type}, ${res.name}, ${res.content},
            ${res.ttl || 1}, ${res.proxied ?? false}, ${res.priority ?? null}, FALSE
          )
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            name = EXCLUDED.name,
            content = EXCLUDED.content,
            ttl = EXCLUDED.ttl,
            proxied = EXCLUDED.proxied,
            priority = EXCLUDED.priority,
            is_deleted = FALSE,
            updated_at = NOW()
        `;
        createdRecords.push(res);
      }

      await logDomainAudit(
        sessionEmail,
        domain.domain_name,
        "APPLY_DNS_TEMPLATE",
        { template: templateName, count: createdRecords.length },
        ip
      );

      return NextResponse.json({
        success: true,
        message: `Applied ${templateName} template successfully.`,
        records: createdRecords,
      });
    }

    // Individual record creation
    const validation = validateDnsRecordInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const newRecord = await provider.createDnsRecord(zoneId, {
      type: body.type,
      name: body.name,
      content: body.content,
      ttl: body.ttl || 1,
      proxied: body.proxied ?? false,
      priority: body.priority,
    });

    await sql`
      INSERT INTO domain_custom_dns_records (
        id, domain_id, type, name, content, ttl, proxied, priority, is_deleted
      ) VALUES (
        ${newRecord.id}, ${domain.id}, ${newRecord.type}, ${newRecord.name}, ${newRecord.content},
        ${newRecord.ttl || 1}, ${newRecord.proxied ?? false}, ${newRecord.priority ?? null}, FALSE
      )
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        name = EXCLUDED.name,
        content = EXCLUDED.content,
        ttl = EXCLUDED.ttl,
        proxied = EXCLUDED.proxied,
        priority = EXCLUDED.priority,
        is_deleted = FALSE,
        updated_at = NOW()
    `;

    await logDomainAudit(
      sessionEmail,
      domain.domain_name,
      "CREATE_DNS_RECORD",
      { record: newRecord },
      ip
    );

    return NextResponse.json({ success: true, record: newRecord });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

/**
 * Update DNS Record
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    await ensureDomainTables();

    const rate = checkRateLimit(`dns:write:${sessionEmail}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many DNS changes. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    if (!body.record_id) {
      return NextResponse.json({ error: "record_id is required." }, { status: 400 });
    }

    const validation = validateDnsRecordInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const provider = getDomainProvider();
    const zoneId = domain.zone_id;
    if (!zoneId) {
      return NextResponse.json({ error: "Zone not found for domain." }, { status: 400 });
    }

    const updated = await provider.updateDnsRecord(zoneId, body.record_id, {
      type: body.type,
      name: body.name,
      content: body.content,
      ttl: body.ttl,
      proxied: body.proxied,
      priority: body.priority,
    });

    await sql`
      INSERT INTO domain_custom_dns_records (
        id, domain_id, type, name, content, ttl, proxied, priority, is_deleted
      ) VALUES (
        ${updated.id}, ${domain.id}, ${updated.type}, ${updated.name}, ${updated.content},
        ${updated.ttl || 1}, ${updated.proxied ?? false}, ${updated.priority ?? null}, FALSE
      )
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        name = EXCLUDED.name,
        content = EXCLUDED.content,
        ttl = EXCLUDED.ttl,
        proxied = EXCLUDED.proxied,
        priority = EXCLUDED.priority,
        is_deleted = FALSE,
        updated_at = NOW()
    `;

    await logDomainAudit(
      sessionEmail,
      domain.domain_name,
      "UPDATE_DNS_RECORD",
      { record_id: body.record_id, changes: body },
      ip
    );

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

/**
 * Delete DNS Record
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    await ensureDomainTables();

    const rate = checkRateLimit(`dns:write:${sessionEmail}`, 40, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many DNS changes. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get("record_id");
    if (!recordId) {
      return NextResponse.json({ error: "record_id is required." }, { status: 400 });
    }

    const provider = getDomainProvider();
    const zoneId = domain.zone_id;
    if (!zoneId) {
      return NextResponse.json({ error: "Zone not found for domain." }, { status: 400 });
    }

    await provider.deleteDnsRecord(zoneId, recordId);

    // Mark as deleted in custom records or insert tombstone
    await sql`
      INSERT INTO domain_custom_dns_records (
        id, domain_id, type, name, content, is_deleted
      ) VALUES (
        ${recordId}, ${domain.id}, 'UNKNOWN', '@', '', TRUE
      )
      ON CONFLICT (id) DO UPDATE SET
        is_deleted = TRUE,
        updated_at = NOW()
    `;

    await logDomainAudit(
      sessionEmail,
      domain.domain_name,
      "DELETE_DNS_RECORD",
      { record_id: recordId },
      ip
    );

    return NextResponse.json({ success: true, message: "DNS Record deleted successfully." });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}


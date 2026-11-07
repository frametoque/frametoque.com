import sql from "@/lib/db";
import { ensureDomainTables } from "./migration";
import { logSystemAction } from "@/lib/logger";

export interface DomainAuditEntry {
  id?: number;
  userEmail: string;
  domainName: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string | null;
  createdAt?: string;
}

export async function logDomainAudit(
  userEmail: string,
  domainName: string,
  action: string,
  details: Record<string, any> = {},
  ipAddress?: string | null
): Promise<void> {
  try {
    await ensureDomainTables();
    await sql`
      INSERT INTO domain_audit_log (
        user_email, domain_name, action, details, ip_address
      ) VALUES (
        ${userEmail}, ${domainName.toLowerCase().trim()}, ${action}, ${JSON.stringify(details)}, ${ipAddress || null}
      )
    `;

    // Also pipe to global system log
    await logSystemAction(
      `[Domain Audit] ${userEmail} performed ${action} on ${domainName}`
    );
  } catch (err) {
    console.error("[Domain Audit] Failed to write audit log:", err);
  }
}

export async function getDomainAuditLogs(
  domainName?: string,
  limit = 50
): Promise<DomainAuditEntry[]> {
  try {
    await ensureDomainTables();
    let rows;
    if (domainName) {
      rows = await sql`
        SELECT * FROM domain_audit_log
        WHERE LOWER(domain_name) = LOWER(${domainName.trim()})
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT * FROM domain_audit_log
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    return rows.map((r: any) => ({
      id: r.id,
      userEmail: r.user_email,
      domainName: r.domain_name,
      action: r.action,
      details: typeof r.details === "string" ? JSON.parse(r.details) : r.details || {},
      ipAddress: r.ip_address,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error("[Domain Audit] Failed to read audit logs:", err);
    return [];
  }
}


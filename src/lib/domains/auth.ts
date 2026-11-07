import { getSessionUser, requireAdminSession, AuthError } from "@/lib/auth-guard";
import sql from "@/lib/db";
import { ensureDomainTables } from "./migration";

export interface OwnedDomain {
  id: number;
  domain_uid?: string;
  client_email: string;
  domain_name: string;
  status: string;
  zone_id: string | null;
  locked: boolean;
  auto_renew: boolean;
  privacy_enabled: boolean;
  nameservers: any;
  registrant_contacts: any;
  dnssec_status: string;
  transfer_status: string;
  expiry_date: string | null;
  invoice_id: string | null;
}

/**
 * Validates that the active session user owns the domain, or is an Administrator.
 * Prevents Insecure Direct Object References (IDOR).
 * Accepts random string UID (e.g. dom_941002ed7a0b), numeric ID (11), or domain name.
 */
export async function requireDomainOwnership(
  domainIdOrName: string | number
): Promise<{ domain: OwnedDomain; sessionEmail: string; isAdmin: boolean }> {
  await ensureDomainTables();
  const session = await getSessionUser();

  if (!session || !session.email) {
    throw new AuthError("Unauthorized: Authentication required", 401);
  }

  const raw = String(domainIdOrName || "").trim();
  const isNumeric = typeof domainIdOrName === "number" || /^\d+$/.test(raw);

  let rows;
  if (isNumeric) {
    rows = await sql`
      SELECT * FROM admin_domain_orders WHERE id = ${Number(raw)} LIMIT 1
    `;
  } else if (raw.startsWith("dom_")) {
    rows = await sql`
      SELECT * FROM admin_domain_orders WHERE domain_uid = ${raw} LIMIT 1
    `;
  } else {
    rows = await sql`
      SELECT * FROM admin_domain_orders 
      WHERE domain_uid = ${raw} OR LOWER(domain_name) = LOWER(${raw})
      LIMIT 1
    `;
  }

  if (rows.length === 0) {
    throw new AuthError("Domain not found.", 404);
  }

  const domain = rows[0] as OwnedDomain;

  // Strict IDOR Check: Must match client_email unless administrator
  const userEmail = session.email.toLowerCase().trim();
  const domainOwnerEmail = (domain.client_email || "").toLowerCase().trim();

  if (!session.isAdmin && userEmail !== domainOwnerEmail) {
    throw new AuthError("Forbidden: You do not have permission to access or manage this domain.", 403);
  }

  return {
    domain,
    sessionEmail: session.email,
    isAdmin: session.isAdmin,
  };
}

export { requireAdminSession };


import { getSessionUser, requireAdminSession, AuthError } from "@/lib/auth-guard";
import sql from "@/lib/db";
import { ensureDomainTables } from "./migration";

export interface OwnedDomain {
  id: number;
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
 */
export async function requireDomainOwnership(
  domainIdOrName: string | number
): Promise<{ domain: OwnedDomain; sessionEmail: string; isAdmin: boolean }> {
  await ensureDomainTables();
  const session = await getSessionUser();

  if (!session || !session.email) {
    throw new AuthError("Unauthorized: Authentication required", 401);
  }

  const isNumeric = typeof domainIdOrName === "number" || /^\d+$/.test(String(domainIdOrName));

  let rows;
  if (isNumeric) {
    rows = await sql`
      SELECT * FROM admin_domain_orders WHERE id = ${Number(domainIdOrName)} LIMIT 1
    `;
  } else {
    rows = await sql`
      SELECT * FROM admin_domain_orders WHERE LOWER(domain_name) = LOWER(${String(domainIdOrName).trim()}) LIMIT 1
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


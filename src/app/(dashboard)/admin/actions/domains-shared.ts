import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { getDomainProvider } from "@/lib/domains/provider";
import { logDomainAudit } from "@/lib/domains/audit";
import { ensureDomainTables } from "@/lib/domains/migration";

/**
 * Automatically provisions domain and creates Cloudflare DNS Zone upon invoice payment.
 */
export async function provisionDomainAfterPayment(invoiceId: string) {
  try {
    await ensureDomainTables();
    const invoiceRows = await sql`
      SELECT project_name, payment_status, user_email FROM invoices WHERE invoice_id = ${invoiceId}
    `;
    if (invoiceRows.length === 0) return;

    const invoice = invoiceRows[0];
    const isPaid = String(invoice.payment_status || "").toLowerCase() === "fully paid" ||
                   String(invoice.payment_status || "").toLowerCase() === "paid";
    if (!isPaid) return;

    const domainRows = await sql`
      SELECT * FROM admin_domain_orders WHERE invoice_id = ${invoiceId}
    `;
    if (domainRows.length === 0) return;

    const domainOrder = domainRows[0];
    const provider = getDomainProvider();

    // 1. If it's a renewal payment, renew/reactivate
    if (String(invoice.project_name || "").toLowerCase().includes("renewal") || domainOrder.status === "expired") {
      const currentExpiry = domainOrder.expiry_date ? new Date(domainOrder.expiry_date) : new Date();
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      const expiryStr = newExpiry.toISOString().split("T")[0] + " 00:00:00";

      await sql`
        UPDATE admin_domain_orders
        SET status = 'active', expiry_date = ${expiryStr}
        WHERE id = ${domainOrder.id}
      `;

      // Record Renewal Expense
      try {
        const rate = domainOrder.activation_lkr_rate ? parseFloat(domainOrder.activation_lkr_rate) : 310;
        const actualCostUsd = parseFloat(domainOrder.renewal_cost || domainOrder.actual_price || "10.46");
        const costLkr = parseFloat((actualCostUsd * rate).toFixed(2));
        const cleanDomain = String(domainOrder.domain_name).toLowerCase().trim();
        const isLk = cleanDomain.endsWith(".lk");

        const existingExp = await sql`
          SELECT id FROM admin_expenses 
          WHERE description LIKE ${`%${invoiceId}%`}
          LIMIT 1
        `;
        if (existingExp.length === 0) {
          await sql`
            INSERT INTO admin_expenses (date, amount, description, category, payment_method)
            VALUES (
              CURRENT_DATE,
              ${costLkr},
              ${`Domain Renewal Cost: ${cleanDomain} (${isLk ? "LK Domain Registry" : "Cloudflare"}) (Inv: ${invoiceId})`},
              'Domain Registration',
              ${isLk ? 'Bank Transfer' : 'Cloudflare Account'}
            )
          `;
        }
      } catch (expErr) {
        console.warn("[Domains Shared] Renewal expense record notice:", expErr);
      }

      await logDomainAudit(
        domainOrder.client_email,
        domainOrder.domain_name,
        "DOMAIN_RENEWAL_COMPLETED",
        { invoice_id: invoiceId, new_expiry: expiryStr }
      );
      await logSystemAction(`Domain "${domainOrder.domain_name}" renewed after payment (Inv: ${invoiceId})`);
      return;
    }

    // 2. If it's a new domain registration that is pending
    if (domainOrder.status === "pending" || !domainOrder.expiry_date) {
      const cleanDomain = String(domainOrder.domain_name).toLowerCase().trim();
      const isLk = cleanDomain.endsWith(".lk");

      // Record wholesale purchase expense in admin_expenses
      try {
        const rate = domainOrder.activation_lkr_rate ? parseFloat(domainOrder.activation_lkr_rate) : 310;
        const actualCostUsd = parseFloat(domainOrder.actual_price || "10.46");
        const costLkr = parseFloat((actualCostUsd * rate).toFixed(2));

        const existingExp = await sql`
          SELECT id FROM admin_expenses 
          WHERE description LIKE ${`%${invoiceId}%`}
          LIMIT 1
        `;
        if (existingExp.length === 0) {
          await sql`
            INSERT INTO admin_expenses (date, amount, description, category, payment_method)
            VALUES (
              CURRENT_DATE,
              ${costLkr},
              ${`Domain Wholesale Registration: ${cleanDomain} (${isLk ? "LK Domain Registry" : "Cloudflare"}) (Inv: ${invoiceId})`},
              'Domain Registration',
              ${isLk ? 'Bank Transfer' : 'Cloudflare Account'}
            )
          `;
        }
      } catch (expErr) {
        console.warn("[Domains Shared] Registration expense record notice:", expErr);
      }

      // For all domains (including .lk and Cloudflare gTLDs/ccTLDs):
      // Mark as pending manual registration so admin can purchase directly on registrar,
      // then click "Sync Live Cloudflare" to establish zone and DNS sync.
      const registrarName = isLk ? "LK Domain Registry" : "Cloudflare";

      await sql`
        UPDATE admin_domain_orders
        SET 
          status = 'pending_manual_registration',
          registrar = ${registrarName}
        WHERE id = ${domainOrder.id}
      `;

      await logDomainAudit(
        domainOrder.client_email,
        cleanDomain,
        "DOMAIN_PAYMENT_RECEIVED_PENDING_PURCHASE",
        {
          invoice_id: invoiceId,
          registrar: registrarName,
        }
      );

      await logSystemAction(
        `[Action Required] Domain "${cleanDomain}" payment received from ${domainOrder.client_email} (Inv: ${invoiceId}). Please manually purchase on ${registrarName}, then click "Sync Live Cloudflare" in Web Services to activate DNS management.`
      );
    }
  } catch (err) {
    console.error("Failed to process domain payment notification:", err);
  }
}

export async function reactivateDomainAfterRenewalPayment(invoiceId: string) {
  return provisionDomainAfterPayment(invoiceId);
}

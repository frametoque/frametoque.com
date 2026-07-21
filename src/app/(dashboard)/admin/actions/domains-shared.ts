import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";

export async function reactivateDomainAfterRenewalPayment(invoiceId: string) {
  try {
    const invoiceRows = await sql`
      SELECT project_name, payment_status FROM invoices WHERE invoice_id = ${invoiceId}
    `;
    if (invoiceRows.length === 0) return;

    const invoice = invoiceRows[0];
    if (!String(invoice.project_name || "").toLowerCase().includes("renewal")) return;
    if (String(invoice.payment_status || "").toLowerCase() !== "fully paid") return;

    const domainRows = await sql`
      SELECT id FROM admin_domain_orders WHERE invoice_id = ${invoiceId}
    `;
    if (domainRows.length === 0) return;

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toISOString().split("T")[0] + " 00:00:00";

    await sql`
      UPDATE admin_domain_orders
      SET status = 'active', expiry_date = ${expiryStr}
      WHERE invoice_id = ${invoiceId}
    `;

    await logSystemAction(`Domain reactivated after renewal payment (Inv: ${invoiceId})`);
  } catch (err) {
    console.error("Failed to reactivate domain after renewal payment:", err);
  }
}

"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-guard";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { generateUniqueInvoiceId } from "./actions";
import { uploadToR2 } from '@/lib/storage';
import { ensureDomainTables } from "@/lib/domains/migration";
import { getDomainProvider } from "@/lib/domains/provider";
import { logDomainAudit, getDomainAuditLogs } from "@/lib/domains/audit";

export async function uploadProviderInvoice(formData: FormData): Promise<string> {
  await requireAdminSession();

  const file = formData.get('file') as File;
  if (!file) {
    throw new Error("No file uploaded");
  }
  try {
    const filename = `admin/provider-invoices/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploaded = await uploadToR2(filename, file, {
      access: 'public',
    });
    return uploaded.url;
  } catch (err: any) {
    console.error("Failed to upload provider invoice:", err);
    throw err;
  }
}

export interface DomainOrder {
  id: number;
  domain_uid?: string | null;
  client_email: string;
  domain_name: string;
  actual_price: number;
  selling_price: number;
  profit: number;
  renewal_cost?: number;
  renewal_price?: number;
  registrar?: string;
  purchase_date: string;
  expiry_date: string;
  status: string;
  invoice_id: string | null;
  created_at: string;
  /** LKR exchange rate that was live at the moment the registration invoice was created */
  activation_lkr_rate?: number | null;
  /** Registration selling price converted to LKR and locked at activation time */
  activation_lkr_price?: number | null;
  /** Actual cost (our cost) converted to LKR and locked at activation time */
  activation_lkr_cost?: number | null;
  /** Renewal bank cost in LKR */
  renewal_lkr_cost?: number | null;
  /** Renewal selling price in LKR */
  renewal_lkr_price?: number | null;
  /** Renewal LKR rate */
  renewal_lkr_rate?: number | null;
  /** Renewal cost currency */
  renewal_cost_currency?: string;
  provider_invoice_url?: string | null;
  actual_price_currency?: string;
  zone_id?: string | null;
  locked?: boolean;
  auto_renew?: boolean;
  privacy_enabled?: boolean;
  nameservers?: any;
  registrant_contacts?: any;
  dnssec_status?: string;
  transfer_status?: string;
  cloudflare_sync_at?: string | null;
}

export interface DomainRenewalHistoryRow {
  id: number;
  domain_order_id: number;
  domain_name: string;
  invoice_id: string;
  renewal_date: string;
  usd_price: number;
  lkr_price: number;
  lkr_rate: number;
  status: string; // e.g. "unpaid" | "paid" | "fully paid"
  renewal_invoice_url?: string | null;
  client_email?: string;
}

/**
 * Plain (non-generic) discriminated-union result types for server actions.
 */
type SimpleActionResult =
  | { success: true }
  | { success: false; error: string };

type StatusUpdateResult =
  | { success: true; invoiceId?: string; skippedInvoice?: boolean; alreadyExists?: boolean }
  | { success: false; error: string };

type CreateInvoiceResult =
  | { success: true; invoiceId: string }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Schema migrations  (run once per server process, cached with a module flag)
// ---------------------------------------------------------------------------

export async function uploadRenewalInvoiceForDomain(formData: FormData): Promise<string> {
  await requireAdminSession();

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');
  try {
    const filename = `admin/renewal-invoices/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const uploaded = await uploadToR2(filename, file, { access: 'public' });
    return uploaded.url;
  } catch (err: any) {
    console.error('Failed to upload renewal invoice:', err);
    throw err;
  }
}

export async function setDomainRenewalInvoiceUrl(
  renewalId: number,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // No migration check needed
    await sql`UPDATE domain_renewal_history SET renewal_invoice_url = ${url} WHERE id = ${renewalId}`;
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error('Failed to set renewal invoice url:', err);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUsdToLkrRate(): Promise<number> {
  try {
    const rateRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const rateData = await rateRes.json();
    return rateData.rates.LKR || 300.0;
  } catch {
    return 300.0;
  }
}

function isInvoiceUnpaid(paymentStatus: string | null | undefined): boolean {
  const status = String(paymentStatus || "").toLowerCase();
  return status !== "fully paid" && status !== "paid";
}

/** Only count domains where registration profit was actually realized. */
function countsTowardProfit(o: DomainOrder): boolean {
  const status = o.status.toLowerCase();
  if (status === "pending") return false;
  if (status === "active") return true;
  if (status === "expired") {
    return !!(o.invoice_id && o.expiry_date);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Read actions
// ---------------------------------------------------------------------------

export async function getDomainOrders(): Promise<DomainOrder[]> {
  await requireAdminSession();
  await ensureDomainTables();

  try {
    // 1. Batch-expire all overdue active domains in a single SQL statement
    const now = new Date().toISOString();
    await sql`
      UPDATE admin_domain_orders
      SET status = 'expired'
      WHERE status = 'active'
        AND expiry_date IS NOT NULL
        AND expiry_date <= ${now}::timestamptz
    `;

    // 2. Query live Cloudflare zones dynamically to verify actual purchase status
    const provider = getDomainProvider();
    let cfZonesMap = new Map<string, { id: string; name_servers: string[]; status: string }>();
    try {
      const liveZones = await provider.listAllAccountZones();
      for (const z of liveZones) {
        cfZonesMap.set(z.name.toLowerCase().trim(), z);
      }
    } catch (cfErr) {
      console.warn("[Domains] Cloudflare live zone query notice:", cfErr);
    }

    const rows = await sql`
      SELECT * FROM admin_domain_orders
      ORDER BY created_at DESC
    `;

    // 3. Dynamically synchronize status with Cloudflare truth
    for (const r of rows) {
      const clean = String(r.domain_name || "").toLowerCase().trim();
      const isLk = clean.endsWith(".lk");
      if (isLk) continue; // .lk is managed outside Cloudflare

      if (cfZonesMap.size > 0) {
        if (cfZonesMap.has(clean)) {
          const cfZone = cfZonesMap.get(clean)!;
          // Domain is verified on Cloudflare -> Mark ACTIVE
          if (r.status !== "active" || r.zone_id !== cfZone.id) {
            r.status = "active";
            r.zone_id = cfZone.id;
            r.nameservers = cfZone.name_servers || [];
            if (!r.expiry_date) {
              const exp = new Date();
              exp.setFullYear(exp.getFullYear() + 1);
              r.expiry_date = exp.toISOString();
            }
            sql`
              UPDATE admin_domain_orders
              SET 
                status = 'active',
                zone_id = ${cfZone.id},
                nameservers = ${JSON.stringify(r.nameservers)}::jsonb,
                expiry_date = COALESCE(expiry_date, ${r.expiry_date}::timestamp),
                cloudflare_sync_at = NOW()
              WHERE id = ${r.id}
            `.catch(() => {});
          }
        } else {
          // Domain does NOT exist in Cloudflare account -> CANNOT be active!
          if (r.status === "active" || (r.zone_id && r.zone_id.startsWith("zone-"))) {
            r.status = r.invoice_id ? "pending_manual_registration" : "pending";
            r.zone_id = null;
            r.expiry_date = null;
            r.nameservers = [];
            sql`
              UPDATE admin_domain_orders
              SET 
                status = ${r.status},
                zone_id = NULL,
                expiry_date = NULL,
                nameservers = '[]'::jsonb
              WHERE id = ${r.id}
            `.catch(() => {});
          }
        }
      }
    }
    return rows.map((r: any) => ({
      ...r,
      actual_price: parseFloat(r.actual_price || 0),
      selling_price: parseFloat(r.selling_price || 0),
      profit: parseFloat(r.profit || 0),
      renewal_cost: parseFloat(r.renewal_cost || 0),
      renewal_price: parseFloat(r.renewal_price || 0),
      registrar: r.registrar || 'Cloudflare',
      purchase_date: r.purchase_date ? new Date(r.purchase_date).toISOString() : '',
      expiry_date: r.expiry_date ? new Date(r.expiry_date).toISOString() : '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      activation_lkr_rate: r.activation_lkr_rate ? parseFloat(r.activation_lkr_rate) : null,
      activation_lkr_price: r.activation_lkr_price ? parseFloat(r.activation_lkr_price) : null,
      activation_lkr_cost: r.activation_lkr_cost ? parseFloat(r.activation_lkr_cost) : null,
      renewal_lkr_cost: r.renewal_lkr_cost ? parseFloat(r.renewal_lkr_cost) : null,
      renewal_lkr_price: r.renewal_lkr_price ? parseFloat(r.renewal_lkr_price) : null,
      renewal_lkr_rate: r.renewal_lkr_rate ? parseFloat(r.renewal_lkr_rate) : null,
      renewal_cost_currency: r.renewal_cost_currency || 'USD',
      provider_invoice_url: r.provider_invoice_url || null,
      actual_price_currency: r.actual_price_currency || 'USD',
      zone_id: r.zone_id || null,
      locked: r.locked ?? true,
      auto_renew: r.auto_renew ?? false,
      privacy_enabled: r.privacy_enabled ?? true,
      nameservers: r.nameservers || [],
      registrant_contacts: r.registrant_contacts || null,
      dnssec_status: r.dnssec_status || 'disabled',
      transfer_status: r.transfer_status || 'none',
      cloudflare_sync_at: r.cloudflare_sync_at ? new Date(r.cloudflare_sync_at).toISOString() : null,
    }));
  } catch (error) {
    console.error("Failed to get domain orders:", error);
    return [];
  }
}

export async function getDomainOrderById(id: number | string): Promise<DomainOrder | null> {
  await requireAdminSession();

  try {
    const raw = String(id ?? "").trim();
    const isNum = /^\d+$/.test(raw);
    const stripped = raw.replace(/^dom_/, "");
    const rows = isNum
      ? await sql`
          SELECT * FROM admin_domain_orders
          WHERE id = ${Number(raw)}
          LIMIT 1
        `
      : await sql`
          SELECT * FROM admin_domain_orders
          WHERE domain_uid = ${raw} OR domain_uid = ${stripped} OR LOWER(domain_name) = LOWER(${raw})
          LIMIT 1
        `;
    if (rows.length === 0) return null;
    const r = rows[0] as any;
    return {
      id: r.id,
      domain_uid: r.domain_uid || null,
      client_email: r.client_email,
      domain_name: r.domain_name,
      status: r.status,
      invoice_id: r.invoice_id || null,
      actual_price: parseFloat(r.actual_price || 0),
      selling_price: parseFloat(r.selling_price || 0),
      profit: parseFloat(r.profit || 0),
      renewal_cost: parseFloat(r.renewal_cost || 0),
      renewal_price: parseFloat(r.renewal_price || 0),
      registrar: r.registrar || 'Internet.bs',
      purchase_date: r.purchase_date ? new Date(r.purchase_date).toISOString() : '',
      expiry_date: r.expiry_date ? new Date(r.expiry_date).toISOString() : '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      activation_lkr_rate: r.activation_lkr_rate ? parseFloat(r.activation_lkr_rate) : null,
      activation_lkr_price: r.activation_lkr_price ? parseFloat(r.activation_lkr_price) : null,
      activation_lkr_cost: r.activation_lkr_cost ? parseFloat(r.activation_lkr_cost) : null,
      renewal_lkr_cost: r.renewal_lkr_cost ? parseFloat(r.renewal_lkr_cost) : null,
      renewal_lkr_price: r.renewal_lkr_price ? parseFloat(r.renewal_lkr_price) : null,
      renewal_lkr_rate: r.renewal_lkr_rate ? parseFloat(r.renewal_lkr_rate) : null,
      renewal_cost_currency: r.renewal_cost_currency || 'USD',
      provider_invoice_url: r.provider_invoice_url || null,
      actual_price_currency: r.actual_price_currency || 'USD',
      zone_id: r.zone_id || null,
      locked: r.locked ?? true,
      auto_renew: r.auto_renew ?? false,
      privacy_enabled: r.privacy_enabled ?? true,
      nameservers: r.nameservers || [],
      registrant_contacts: r.registrant_contacts || null,
      dnssec_status: r.dnssec_status || 'disabled',
      transfer_status: r.transfer_status || 'none',
      cloudflare_sync_at: r.cloudflare_sync_at ? new Date(r.cloudflare_sync_at).toISOString() : null,
    };
  } catch (error) {
    console.error("Failed to get domain order by id:", error);
    return null;
  }
}

export async function getDomainRenewalHistory(domainOrderId: number): Promise<DomainRenewalHistoryRow[]> {
  await requireAdminSession();

  try {
    const rows = await sql`
      SELECT h.*, i.payment_status
      FROM domain_renewal_history h
      INNER JOIN invoices i ON h.invoice_id = i.invoice_id
      WHERE h.domain_order_id = ${domainOrderId}
      ORDER BY h.renewal_date DESC
    `;
    const history = rows.map((r: any) => ({
      id: r.id,
      domain_order_id: r.domain_order_id,
      domain_name: r.domain_name,
      client_email: r.client_email,
      invoice_id: r.invoice_id,
      renewal_date: r.renewal_date ? new Date(r.renewal_date).toISOString() : '',
      usd_price: parseFloat(r.usd_price || 0),
      lkr_price: parseFloat(r.lkr_price || 0),
      lkr_rate: parseFloat(r.lkr_rate || 0),
      status: r.payment_status || r.status || 'unpaid',
      renewal_invoice_url: r.renewal_invoice_url || null,
    }));

    // Fetch original registration invoice details to show in the list
    const orderRows = await sql`
      SELECT domain_name, actual_price, selling_price, activation_lkr_rate, activation_lkr_price 
      FROM admin_domain_orders 
      WHERE id = ${domainOrderId}
    `;

    if (orderRows.length > 0) {
      const order = orderRows[0];
      const regInvoiceRows = await sql`
        SELECT invoice_id, date, payment_status, subtotal 
        FROM invoices 
        WHERE project_name = ${`Domain Registration: ${order.domain_name}`}
        LIMIT 1
      `;

      if (regInvoiceRows.length > 0) {
        const regInv = regInvoiceRows[0];
        const usdPrice = parseFloat(order.selling_price || 0);
        const lkrRate = parseFloat(order.activation_lkr_rate || 300);
        const lkrPrice = parseFloat(order.activation_lkr_price || (usdPrice * lkrRate).toFixed(2));

        history.push({
          id: -1, // Dummy ID indicating registration
          domain_order_id: domainOrderId,
          domain_name: order.domain_name,
          client_email: order.client_email,
          invoice_id: regInv.invoice_id,
          renewal_date: regInv.date ? new Date(regInv.date).toISOString() : '',
          usd_price: usdPrice,
          lkr_price: lkrPrice,
          lkr_rate: lkrRate,
          status: regInv.payment_status || 'unpaid',
          renewal_invoice_url: null,
        });
      }
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.renewal_date).getTime() - new Date(a.renewal_date).getTime());
    return history;
  } catch (error) {
    console.error("Failed to get domain renewal history:", error);
    return [];
  }
}

export async function getAllRenewalHistory(): Promise<DomainRenewalHistoryRow[]> {
  await requireAdminSession();

  try {
    const rows = await sql`
      SELECT h.*, i.payment_status
      FROM domain_renewal_history h
      INNER JOIN invoices i ON h.invoice_id = i.invoice_id
      ORDER BY h.renewal_date DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      domain_order_id: r.domain_order_id,
      domain_name: r.domain_name,
      invoice_id: r.invoice_id,
      renewal_date: r.renewal_date ? new Date(r.renewal_date).toISOString() : '',
      usd_price: parseFloat(r.usd_price || 0),
      lkr_price: parseFloat(r.lkr_price || 0),
      lkr_rate: parseFloat(r.lkr_rate || 0),
      status: r.payment_status || r.status || 'unpaid',
    }));
  } catch (error) {
    console.error("Failed to get all renewal history:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Write actions
// ---------------------------------------------------------------------------

export async function addDomainOrder(
  order: Omit<DomainOrder, "id" | "created_at" | "purchase_date">
): Promise<SimpleActionResult> {
  await requireAdminSession();

  try {
    await sql`
      INSERT INTO admin_domain_orders (
        client_email, domain_name, actual_price, selling_price, profit, 
        renewal_cost, renewal_price, registrar, expiry_date, status, 
        invoice_id, provider_invoice_url, actual_price_currency,
        activation_lkr_rate, activation_lkr_price, activation_lkr_cost,
        renewal_lkr_cost, renewal_lkr_price, renewal_lkr_rate, renewal_cost_currency
      ) VALUES (
        ${order.client_email}, ${order.domain_name}, ${order.actual_price}, ${order.selling_price}, 
        ${order.profit}, ${order.renewal_cost ?? null}, ${order.renewal_price ?? null}, ${order.registrar || 'Internet.bs'}, 
        ${order.expiry_date || null}, ${order.status}, ${order.invoice_id || null}, ${order.provider_invoice_url || null}, 
        ${order.actual_price_currency || 'USD'},
        ${order.activation_lkr_rate ?? null}, ${order.activation_lkr_price ?? null}, ${order.activation_lkr_cost ?? null},
        ${order.renewal_lkr_cost ?? null}, ${order.renewal_lkr_price ?? null}, ${order.renewal_lkr_rate ?? null},
        ${order.renewal_cost_currency || 'USD'}
      )
    `;
    await logSystemAction(`Domain order placed: "${order.domain_name}" for client "${order.client_email}"`);
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to add domain order:", err);
    return { success: false, error: err.message };
  }
}

export type DomainExpiryOptions = {
  skipRenewalInvoice?: boolean;
  currency?: "USD" | "LKR";
};

type DomainExpiryResult =
  | { success: false; error: string }
  | { success: true; invoiceId: string | null; skippedInvoice?: boolean; alreadyExists?: boolean };

export async function createDomainRenewalInvoice(id: number, currency: "USD" | "LKR" = "USD"): Promise<DomainExpiryResult> {
  await requireAdminSession();

  try {
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    const renewalPrice = parseFloat(o.renewal_price || o.selling_price || 0);
    if (renewalPrice <= 0) {
      return { success: false, error: "Renewal price is not configured for this domain" };
    }

    // Fetch live LKR rate — or use saved renewal LKR rate/price
    const liveRate = await getUsdToLkrRate();
    const lkrRate = o.renewal_lkr_rate ? parseFloat(o.renewal_lkr_rate) : liveRate;
    const roundToNearest10 = (amount: number): number => Math.ceil((amount || 0) / 10) * 10;
    const lkrPrice = o.renewal_lkr_price ? roundToNearest10(parseFloat(o.renewal_lkr_price)) : roundToNearest10(parseFloat((renewalPrice * lkrRate).toFixed(2)));

    let finalPrice = renewalPrice;
    const invCurrency = currency;

    if (currency === "LKR") {
      finalPrice = lkrPrice;
    }

    const invoiceId = await generateUniqueInvoiceId();

    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date,
        subtotal, discount, total, advance, total_due,
        work_status, payment_status, currency, category
      ) VALUES (
        ${invoiceId}, ${o.client_email},
        ${`Domain Renewal: ${o.domain_name}`}, CURRENT_DATE,
        ${finalPrice}, 0, ${finalPrice}, 0, ${finalPrice},
        'completed', 'unpaid', ${invCurrency}, 'Domain'
      )
    `;

    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
      VALUES (${invoiceId}, ${`1 Year Renewal for ${o.domain_name}`}, 1, ${finalPrice}, ${finalPrice})
    `;

    await sql`
      UPDATE admin_domain_orders
      SET invoice_id = ${invoiceId}
      WHERE id = ${id}
    `;

    // Insert locked renewal history row
    await sql`
      INSERT INTO domain_renewal_history (
        domain_order_id, domain_name, client_email, invoice_id,
        usd_price, lkr_price, lkr_rate, status
      ) VALUES (
        ${id}, ${o.domain_name}, ${o.client_email}, ${invoiceId},
        ${renewalPrice}, ${lkrPrice}, ${lkrRate}, 'unpaid'
      )
    `;

    await logSystemAction(`Domain renewal invoice generated (ID: ${id}, Inv: ${invoiceId})`);
    return { success: true, invoiceId };
  } catch (err: any) {
    console.error("Failed to create domain renewal invoice:", err);
    return { success: false, error: err.message };
  }
}

async function handleDomainExpiry(id: number, options: DomainExpiryOptions = {}): Promise<DomainExpiryResult> {
  if (options.skipRenewalInvoice) {
    await sql`
      UPDATE admin_domain_orders
      SET invoice_id = NULL
      WHERE id = ${id}
    `;
    return { success: true, invoiceId: null as string | null, skippedInvoice: true };
  }

  const orders = await sql`SELECT invoice_id FROM admin_domain_orders WHERE id = ${id}`;
  if (orders.length === 0) return { success: false, error: "Order not found" };

  const linkedInvoiceId = orders[0].invoice_id;
  if (linkedInvoiceId) {
    const existingInv = await sql`
      SELECT payment_status, project_name FROM invoices WHERE invoice_id = ${linkedInvoiceId}
    `;
    if (
      existingInv.length > 0 &&
      isInvoiceUnpaid(existingInv[0].payment_status) &&
      String(existingInv[0].project_name || "").toLowerCase().includes("renewal")
    ) {
      return { success: true, invoiceId: linkedInvoiceId, alreadyExists: true };
    }
  }

  return createDomainRenewalInvoice(id, options.currency || "USD");
}

export async function updateDomainOrderStatus(
  id: number,
  status: string,
  options?: DomainExpiryOptions
): Promise<StatusUpdateResult> {
  await requireAdminSession();

  try {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === "active") {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      const expiryStr = expiry.toISOString().split("T")[0] + " 00:00:00";
      await sql`
        UPDATE admin_domain_orders
        SET status = ${status}, expiry_date = ${expiryStr}
        WHERE id = ${id}
      `;
    } else if (normalizedStatus === "expired") {
      await sql`
        UPDATE admin_domain_orders
        SET status = ${status}
        WHERE id = ${id}
      `;
      const expiryResult = await handleDomainExpiry(id, options);
      if (!expiryResult.success) return expiryResult;
      await logSystemAction(`Domain order status updated (ID: ${id}) to "${status}"`);
      return {
        success: true,
        invoiceId: expiryResult.invoiceId ?? undefined,
        skippedInvoice: expiryResult.skippedInvoice,
        alreadyExists: expiryResult.alreadyExists,
      };
    } else {
      await sql`
        UPDATE admin_domain_orders
        SET status = ${status}
        WHERE id = ${id}
      `;
    }
    await logSystemAction(`Domain order status updated (ID: ${id}) to "${status}"`);
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update domain order status:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteDomainOrder(id: number, deleteInvoices: boolean = false): Promise<SimpleActionResult> {
  await requireAdminSession();

  try {
    // 1. Fetch domain order details first
    const orders = await sql`SELECT domain_name, invoice_id FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];
    const domainName = o.domain_name;

    if (deleteInvoices) {
      // 2. Fetch all renewal invoices linked in history
      const renewalRows = await sql`
        SELECT invoice_id FROM domain_renewal_history WHERE domain_order_id = ${id}
      `;
      const invoiceIds = renewalRows.map((r: any) => r.invoice_id);

      // 3. Find registration invoice
      const regInvoices = await sql`
        SELECT invoice_id FROM invoices 
        WHERE project_name = ${`Domain Registration: ${domainName}`}
      `;
      regInvoices.forEach((r: any) => {
        if (!invoiceIds.includes(r.invoice_id)) {
          invoiceIds.push(r.invoice_id);
        }
      });

      // 4. Include the currently linked invoice ID on the domain order if any
      if (o.invoice_id && !invoiceIds.includes(o.invoice_id)) {
        invoiceIds.push(o.invoice_id);
      }

      // 5. Delete all these invoices and their items
      if (invoiceIds.length > 0) {
        // Delete items first
        await sql`
          DELETE FROM invoice_items 
          WHERE invoice_id = ANY(${invoiceIds})
        `;
        // Delete invoices
        await sql`
          DELETE FROM invoices 
          WHERE invoice_id = ANY(${invoiceIds})
        `;
      }

      // 6. Delete renewal history records
      await sql`
        DELETE FROM domain_renewal_history 
        WHERE domain_order_id = ${id}
      `;
    }

    // 7. Delete the domain order itself
    await sql`
      DELETE FROM admin_domain_orders
      WHERE id = ${id}
    `;

    await logSystemAction(`Domain order deleted (ID: ${id}) ${deleteInvoices ? "with all linked invoices" : "only"}`);
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete domain order:", err);
    return { success: false, error: err.message };
  }
}

export async function updateDomainOrder(
  id: number,
  order: Partial<DomainOrder>,
  options?: DomainExpiryOptions
): Promise<StatusUpdateResult> {
  await requireAdminSession();

  try {
    const currentRows = await sql`SELECT status FROM admin_domain_orders WHERE id = ${id}`;
    if (currentRows.length === 0) return { success: false, error: "Order not found" };

    const previousStatus = String(currentRows[0].status || "").toLowerCase();
    const nextStatus = String(order.status || previousStatus).toLowerCase();
    const becomingExpired = nextStatus === "expired" && previousStatus !== "expired";

    const expiryStr = order.expiry_date ? order.expiry_date.split("T")[0] : null;
    await sql`
      UPDATE admin_domain_orders
      SET 
        client_email = COALESCE(${order.client_email}, client_email),
        domain_name = COALESCE(${order.domain_name}, domain_name),
        actual_price = COALESCE(${order.actual_price}, actual_price),
        selling_price = COALESCE(${order.selling_price}, selling_price),
        profit = COALESCE(${order.profit}, profit),
        renewal_cost = COALESCE(${order.renewal_cost}, renewal_cost),
        renewal_price = COALESCE(${order.renewal_price}, renewal_price),
        registrar = COALESCE(${order.registrar}, registrar),
        expiry_date = COALESCE(${expiryStr ? expiryStr + " 00:00:00" : null}::timestamp, expiry_date),
        status = COALESCE(${order.status}, status),
        provider_invoice_url = COALESCE(${order.provider_invoice_url}, provider_invoice_url),
        actual_price_currency = COALESCE(${order.actual_price_currency}, actual_price_currency),
        activation_lkr_rate = ${order.activation_lkr_rate !== undefined ? order.activation_lkr_rate : sql`activation_lkr_rate`},
        activation_lkr_price = ${order.activation_lkr_price !== undefined ? order.activation_lkr_price : sql`activation_lkr_price`},
        activation_lkr_cost = ${order.activation_lkr_cost !== undefined ? order.activation_lkr_cost : sql`activation_lkr_cost`},
        renewal_lkr_cost = ${order.renewal_lkr_cost !== undefined ? order.renewal_lkr_cost : sql`renewal_lkr_cost`},
        renewal_lkr_price = ${order.renewal_lkr_price !== undefined ? order.renewal_lkr_price : sql`renewal_lkr_price`},
        renewal_lkr_rate = ${order.renewal_lkr_rate !== undefined ? order.renewal_lkr_rate : sql`renewal_lkr_rate`},
        renewal_cost_currency = ${order.renewal_cost_currency !== undefined ? order.renewal_cost_currency : sql`renewal_cost_currency`},
        invoice_id = ${order.invoice_id !== undefined ? order.invoice_id : sql`invoice_id`}
      WHERE id = ${id}
    `;

    if (becomingExpired) {
      const expiryResult = await handleDomainExpiry(id, options);
      if (!expiryResult.success) return expiryResult;
      await logSystemAction(`Domain order updated (ID: ${id})`);
      return {
        success: true,
        invoiceId: expiryResult.invoiceId ?? undefined,
        skippedInvoice: expiryResult.skippedInvoice,
        alreadyExists: expiryResult.alreadyExists,
      };
    }

    await logSystemAction(`Domain order updated (ID: ${id})`);
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update domain order:", err);
    return { success: false, error: err.message };
  }
}

export async function linkInvoiceToDomainOrder(
  domainOrderId: number,
  invoiceId: string | null
): Promise<SimpleActionResult> {
  await requireAdminSession();

  try {
    await sql`
      UPDATE admin_domain_orders
      SET invoice_id = ${invoiceId}
      WHERE id = ${domainOrderId}
    `;
    await logSystemAction(`Domain order ${domainOrderId} ${invoiceId ? `linked to invoice ${invoiceId}` : 'unlinked from invoice'}`);
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to link invoice to domain order:", err);
    return { success: false, error: err.message };
  }
}

export async function getInvoicesForLinking(clientEmail?: string) {
  await requireAdminSession();

  try {
    const emailPattern = clientEmail ? clientEmail.toLowerCase().trim() : '';
    const rows = await sql`
      SELECT invoice_id, user_email, project_name, total, currency, payment_status, date
      FROM invoices
      ORDER BY 
        CASE WHEN ${emailPattern} <> '' AND LOWER(user_email) = ${emailPattern} THEN 0 ELSE 1 END,
        date DESC, created_at DESC
      LIMIT 100
    `;
    return rows.map((r: any) => ({
      invoice_id: r.invoice_id,
      user_email: r.user_email,
      project_name: r.project_name,
      total: parseFloat(r.total || 0),
      currency: r.currency || 'LKR',
      payment_status: r.payment_status || 'unpaid',
      date: r.date ? new Date(r.date).toISOString() : '',
    }));
  } catch (err: any) {
    console.error("Failed to get invoices for linking:", err);
    return [];
  }
}

export async function createDomainInvoice(
  id: number,
  currency: 'USD' | 'LKR'
): Promise<CreateInvoiceResult> {
  await requireAdminSession();

  try {
    // 1. Fetch domain order details
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    const sellingPriceUsd = parseFloat(o.selling_price);
    const actualPriceUsd = parseFloat(o.actual_price);

    // 2. Fetch live LKR rate or use saved activation LKR rate
    const liveRate = await getUsdToLkrRate();
    const lkrRate = o.activation_lkr_rate ? parseFloat(o.activation_lkr_rate) : liveRate;
    const lkrSellingPrice = o.activation_lkr_price ? parseFloat(o.activation_lkr_price) : parseFloat((sellingPriceUsd * lkrRate).toFixed(2));
    const lkrActualPrice = o.activation_lkr_cost ? parseFloat(o.activation_lkr_cost) : parseFloat((actualPriceUsd * lkrRate).toFixed(2));

    // 3. Calculate final invoice price based on selected currency
    let finalSellingPrice = sellingPriceUsd;
    const invCurrency = currency;
    
    if (currency === "LKR") {
      finalSellingPrice = lkrSellingPrice;
    }

    const invoiceId = await generateUniqueInvoiceId();

    // 5. Insert parent invoice
    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date, 
        subtotal, discount, total, advance, total_due, 
        work_status, payment_status, currency, category
      ) VALUES (
        ${invoiceId}, ${o.client_email},
        ${`Domain Registration: ${o.domain_name}`}, CURRENT_DATE,
        ${finalSellingPrice}, 0, ${finalSellingPrice}, 0, ${finalSellingPrice},
        'completed', 'unpaid', ${invCurrency}, 'Domain'
      )
    `;

    // 6. Insert invoice item
    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
      VALUES (${invoiceId}, ${`1 Year Registration for ${o.domain_name}`}, 1, ${finalSellingPrice}, ${finalSellingPrice})
    `;

    // 7. Update domain order: link invoice + snapshot locked LKR values
    await sql`
      UPDATE admin_domain_orders
      SET 
        invoice_id = ${invoiceId},
        activation_lkr_rate = ${lkrRate},
        activation_lkr_price = ${lkrSellingPrice},
        activation_lkr_cost = ${lkrActualPrice}
      WHERE id = ${id}
    `;

    await logSystemAction(`Domain invoice generated (ID: ${id}, Inv: ${invoiceId})`);
    return { success: true, invoiceId };
  } catch (err: any) {
    console.error("Failed to create domain invoice:", err);
    return { success: false, error: err.message };
  }
}

export async function renewExpiredDomain(id: number): Promise<CreateInvoiceResult> {
  await requireAdminSession();

  try {
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    // Calculate new expiry date (+1 year from now)
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toISOString().split("T")[0] + " 00:00:00";

    const renewalPriceUsd = parseFloat(o.renewal_price || o.selling_price || 0);
    if (renewalPriceUsd <= 0) {
      return { success: false, error: "Renewal price is not configured for this domain" };
    }

    // Get live exchange rate
    const lkrRate = await getUsdToLkrRate();
    const roundToNearest10 = (amount: number): number => Math.ceil((amount || 0) / 10) * 10;
    const lkrPrice = roundToNearest10(renewalPriceUsd * lkrRate);

    const invoiceId = await generateUniqueInvoiceId();

    // Create invoice in LKR
    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date,
        subtotal, discount, total, advance, total_due,
        work_status, payment_status, currency, category
      ) VALUES (
        ${invoiceId}, ${o.client_email},
        ${`Domain Renewal: ${o.domain_name}`}, CURRENT_DATE,
        ${lkrPrice}, 0, ${lkrPrice}, 0, ${lkrPrice},
        'completed', 'unpaid', 'LKR', 'Domain'
      )
    `;

    // Create invoice item
    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
      VALUES (${invoiceId}, ${`1 Year Renewal for ${o.domain_name}`}, 1, ${lkrPrice}, ${lkrPrice})
    `;

    // Update domain order to active & link invoice
    await sql`
      UPDATE admin_domain_orders
      SET 
        status = 'active', 
        expiry_date = ${expiryStr},
        invoice_id = ${invoiceId}
      WHERE id = ${id}
    `;

    // Insert renewal history row with locked LKR details
    await sql`
      INSERT INTO domain_renewal_history (
        domain_order_id, domain_name, client_email, invoice_id,
        usd_price, lkr_price, lkr_rate, status
      ) VALUES (
        ${id}, ${o.domain_name}, ${o.client_email}, ${invoiceId},
        ${renewalPriceUsd}, ${lkrPrice}, ${lkrRate}, 'unpaid'
      )
    `;

    await logSystemAction(`Domain renewed manually by admin (ID: ${id}, Inv: ${invoiceId})`);
    return { success: true, invoiceId };
  } catch (err: any) {
    console.error("Failed to renew expired domain:", err);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Cloudflare Sync & TLD Pricing Actions
// ---------------------------------------------------------------------------

export interface TldPricingItem {
  id?: number;
  tld: string;
  cost_price: number;
  markup: number;
  selling_price: number;
  renewal_cost: number;
  renewal_price: number;
  currency?: string;
  provider?: string;
  is_active?: boolean;
  updated_at?: string;
}

/**
 * Sync domain status, zone, expiry, lock, and DNSSEC directly from Cloudflare.
 */
export async function syncDomainFromCloudflare(
  id: number
): Promise<{ success: boolean; error?: string; details?: any }> {
  await requireAdminSession();
  await ensureDomainTables();

  try {
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Domain not found." };
    const order = orders[0];

    const provider = getDomainProvider();
    const cleanDomain = String(order.domain_name).toLowerCase().trim();

    // 1. Verify if domain exists as a live zone on Cloudflare
    const liveZone = await provider.getLiveZone(cleanDomain);
    if (!liveZone) {
      // Domain is NOT registered/present on Cloudflare
      const newStatus = order.invoice_id ? "pending_manual_registration" : "pending";
      await sql`
        UPDATE admin_domain_orders
        SET 
          status = ${newStatus},
          zone_id = NULL,
          expiry_date = NULL,
          nameservers = '[]'::jsonb,
          cloudflare_sync_at = NOW()
        WHERE id = ${id}
      `;

      await logSystemAction(
        `Cloudflare Sync: Domain "${cleanDomain}" was not found in your Cloudflare account. Status set to ${newStatus}.`
      );

      revalidatePath("/admin", "layout");
      revalidatePath("/admin/web-services", "page");
      revalidatePath("/dashboard/domains", "page");

      return {
        success: false,
        error: `Domain "${cleanDomain}" is not found in your Cloudflare account yet. Please purchase it on Cloudflare Registrar first, then click Sync.`,
      };
    }

    // 2. Domain is confirmed on Cloudflare
    const cfDetails = await provider.getDomain(cleanDomain);
    const dnssecInfo = await provider.getDnssec(liveZone.zoneId);

    const locked = cfDetails?.locked ?? order.locked ?? true;
    const autoRenew = cfDetails?.autoRenew ?? order.auto_renew ?? false;
    const dnssecStatus = dnssecInfo.status || order.dnssec_status || 'disabled';
    const status = 'active';

    let expiryDate = cfDetails?.expiresAt || order.expiry_date;
    if (!expiryDate) {
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + 1);
      expiryDate = exp.toISOString().split("T")[0] + " 00:00:00";
    }

    await sql`
      UPDATE admin_domain_orders
      SET 
        zone_id = ${liveZone.zoneId},
        nameservers = ${JSON.stringify(liveZone.nameservers)}::jsonb,
        locked = ${locked},
        auto_renew = ${autoRenew},
        status = 'active',
        expiry_date = ${expiryDate},
        dnssec_status = ${dnssecStatus},
        cloudflare_sync_at = NOW()
      WHERE id = ${id}
    `;

    await logDomainAudit(
      "admin",
      cleanDomain,
      "ADMIN_SYNC_CLOUDFLARE",
      { zone_id: liveZone.zoneId, status, locked, expiryDate }
    );

    await logSystemAction(
      `Domain "${cleanDomain}" synchronized with Cloudflare: Zone ID ${liveZone.zoneId}, Status: ${status}`
    );

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/web-services", "page");
    revalidatePath("/dashboard/domains", "page");
    return {
      success: true,
      details: {
        zoneId: liveZone.zoneId,
        nameservers: liveZone.nameservers,
        locked,
        autoRenew,
        status,
        expiryDate,
        dnssecStatus,
      },
    };
  } catch (err: any) {
    console.error("Failed to sync domain from Cloudflare:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Sync all domains from Cloudflare
 */
export async function syncAllDomainsFromCloudflare(): Promise<{
  success: boolean;
  totalSynced: number;
  errors: string[];
}> {
  await requireAdminSession();
  await ensureDomainTables();

  const orders = await sql`SELECT id FROM admin_domain_orders ORDER BY id DESC`;
  let synced = 0;
  const errors: string[] = [];

  for (const o of orders) {
    try {
      const res = await syncDomainFromCloudflare(o.id);
      if (res.success) synced += 1;
      else if (res.error) errors.push(`Domain #${o.id}: ${res.error}`);
    } catch (e: any) {
      errors.push(`Domain #${o.id}: ${e.message}`);
    }
  }

  revalidatePath("/admin", "layout");
  return { success: true, totalSynced: synced, errors };
}

/**
 * Manually activate and link a domain with Cloudflare DNS zone
 * (Used when domain is purchased directly on Cloudflare Registrar)
 */
export async function manualRegisterDomain(
  id: number
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  await requireAdminSession();
  await ensureDomainTables();

  try {
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Domain not found." };
    const order = orders[0];

    const provider = getDomainProvider();
    const cleanDomain = String(order.domain_name).toLowerCase().trim();

    // Fetch or create live zone in Cloudflare
    const zoneInfo = await provider.getOrCreateZone(cleanDomain);

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toISOString().split("T")[0] + " 00:00:00";

    await sql`
      UPDATE admin_domain_orders
      SET 
        status = 'active',
        expiry_date = COALESCE(expiry_date, ${expiryStr}::timestamp),
        zone_id = ${zoneInfo.zoneId},
        nameservers = ${JSON.stringify(zoneInfo.nameservers)}::jsonb,
        cloudflare_sync_at = NOW()
      WHERE id = ${id}
    `;

    await logDomainAudit(
      "admin",
      cleanDomain,
      "ADMIN_MANUAL_REGISTRATION_SYNC",
      { zone_id: zoneInfo.zoneId, nameservers: zoneInfo.nameservers }
    );

    await logSystemAction(
      `Admin activated and linked domain "${cleanDomain}" with Cloudflare Zone ${zoneInfo.zoneId}`
    );

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/web-services", "page");
    revalidatePath("/dashboard/domains", "page");
    return { success: true, orderId: zoneInfo.zoneId };
  } catch (err: any) {
    console.error("Manual registration failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get TLD Pricing catalog for Admin
 */
export async function getTldPricing(): Promise<TldPricingItem[]> {
  await requireAdminSession();
  await ensureDomainTables();

  try {
    const rows = await sql`
      SELECT * FROM tld_pricing ORDER BY tld ASC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      tld: r.tld,
      cost_price: parseFloat(r.cost_price),
      markup: parseFloat(r.markup),
      selling_price: parseFloat(r.selling_price),
      renewal_cost: parseFloat(r.renewal_cost),
      renewal_price: parseFloat(r.renewal_price),
      currency: r.currency || 'USD',
      provider: r.provider || 'Cloudflare',
      is_active: r.is_active ?? true,
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));
  } catch (err) {
    console.error("Failed to get TLD pricing:", err);
    return [];
  }
}

/**
 * Sync all TLD Cost Prices in real time from Cloudflare Registrar API
 */
export async function syncAllTldPricingFromCloudflare(): Promise<{
  success: boolean;
  syncedCount: number;
  pricings: TldPricingItem[];
  error?: string;
}> {
  await requireAdminSession();
  await ensureDomainTables();

  try {
    const provider = getDomainProvider();
    const rows = await sql`SELECT * FROM tld_pricing WHERE is_active = true ORDER BY tld ASC`;
    let syncedCount = 0;

    for (const row of rows) {
      const tld = row.tld.toLowerCase().trim();
      if (tld === "lk") {
        await sql`
          UPDATE tld_pricing
          SET provider = 'LK Domain Registry', updated_at = NOW()
          WHERE id = ${row.id}
        `;
        continue;
      }

      try {
        const probeRes = await provider.checkAvailability(`pricing-probe-${tld}.${tld}`);
        if (probeRes.costPrice && probeRes.costPrice > 0) {
          const liveCost = Number(probeRes.costPrice);
          const currentMarkup = Number(row.markup) || 5.50;
          const newSelling = parseFloat((liveCost + currentMarkup).toFixed(2));
          const newRenewal = parseFloat((liveCost + currentMarkup).toFixed(2));

          await sql`
            UPDATE tld_pricing
            SET 
              cost_price = ${liveCost},
              renewal_cost = ${liveCost},
              selling_price = ${newSelling},
              renewal_price = ${newRenewal},
              provider = 'Cloudflare',
              updated_at = NOW()
            WHERE id = ${row.id}
          `;
          syncedCount++;
        }
      } catch (err: any) {
        console.warn(`[TLD Cloudflare Sync] Error for .${tld}:`, err.message);
      }
    }

    const updatedRows = await sql`SELECT * FROM tld_pricing ORDER BY tld ASC`;
    const pricings = updatedRows.map((r: any) => ({
      id: r.id,
      tld: r.tld,
      cost_price: parseFloat(r.cost_price),
      markup: parseFloat(r.markup),
      selling_price: parseFloat(r.selling_price),
      renewal_cost: parseFloat(r.renewal_cost),
      renewal_price: parseFloat(r.renewal_price),
      currency: r.currency || 'USD',
      provider: r.provider || 'Cloudflare',
      is_active: r.is_active ?? true,
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));

    await logSystemAction(`Admin synced live TLD cost prices from Cloudflare (${syncedCount} TLDs updated)`);
    revalidatePath("/admin", "layout");

    return { success: true, syncedCount, pricings };
  } catch (err: any) {
    console.error("Failed to sync TLD pricing from Cloudflare:", err);
    return { success: false, syncedCount: 0, pricings: [], error: err.message };
  }
}

/**
 * Update or insert TLD pricing in Admin
 */
export async function updateTldPricing(
  item: TldPricingItem
): Promise<{ success: boolean; error?: string }> {
  await requireAdminSession();
  await ensureDomainTables();

  try {
    const cleanTld = item.tld.replace(/^\./, "").toLowerCase().trim();
    const cost = Number(item.cost_price);
    const markup = Number(item.markup);
    const selling = Number(item.selling_price || cost + markup);
    const renewCost = Number(item.renewal_cost || cost);
    const renewPrice = Number(item.renewal_price || renewCost + markup);

    await sql`
      INSERT INTO tld_pricing (
        tld, cost_price, markup, selling_price, renewal_cost, renewal_price, provider, is_active, updated_at
      ) VALUES (
        ${cleanTld}, ${cost}, ${markup}, ${selling}, ${renewCost}, ${renewPrice}, ${item.provider || (cleanTld === 'lk' ? 'LK Domain Registry' : 'Cloudflare')}, ${item.is_active ?? true}, NOW()
      )
      ON CONFLICT (tld) DO UPDATE SET
        cost_price = EXCLUDED.cost_price,
        markup = EXCLUDED.markup,
        selling_price = EXCLUDED.selling_price,
        renewal_cost = EXCLUDED.renewal_cost,
        renewal_price = EXCLUDED.renewal_price,
        provider = EXCLUDED.provider,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `;

    await logSystemAction(`Admin updated TLD pricing for .${cleanTld} (Cost: $${cost}, Sell: $${selling})`);
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update TLD pricing:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch domain audit log entries for Admin
 */
export async function getAdminAuditLogs(
  domainName?: string,
  limit = 50
) {
  await requireAdminSession();
  return getDomainAuditLogs(domainName, limit);
}

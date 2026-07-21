"use server";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";

export interface DomainOrder {
  id: number;
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
// Schema migrations
// ---------------------------------------------------------------------------

export async function ensureDomainOrdersTable() {
  try {
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS renewal_cost NUMERIC(12, 2)`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS renewal_price NUMERIC(12, 2)`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS registrar VARCHAR(100) DEFAULT 'Internet.bs'`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ALTER COLUMN expiry_date DROP NOT NULL`; } catch(e){}
    // New columns — locked LKR values at activation time
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS activation_lkr_rate NUMERIC(10, 4)`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS activation_lkr_price NUMERIC(12, 2)`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS activation_lkr_cost NUMERIC(12, 2)`; } catch(e){}
  } catch (err: any) {
    console.error("Migration: failed to alter admin_domain_orders table", err);
  }
}

export async function ensureDomainRenewalHistoryTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS domain_renewal_history (
        id               SERIAL PRIMARY KEY,
        domain_order_id  INTEGER NOT NULL,
        domain_name      VARCHAR(255) NOT NULL,
        client_email     VARCHAR(255) NOT NULL,
        invoice_id       VARCHAR(100) NOT NULL,
        renewal_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        usd_price        NUMERIC(12, 2) NOT NULL,
        lkr_price        NUMERIC(12, 2) NOT NULL,
        lkr_rate         NUMERIC(10, 4) NOT NULL,
        status           VARCHAR(50) NOT NULL DEFAULT 'unpaid'
      )
    `;
  } catch (err: any) {
    console.error("Migration: failed to create domain_renewal_history table", err);
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
  await ensureDomainOrdersTable();
  await ensureDomainRenewalHistoryTable();
  try {
    const rows = await sql`
      SELECT * FROM admin_domain_orders
      ORDER BY created_at DESC
    `;
    return rows.map((r: any) => ({
      ...r,
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
    }));
  } catch (error) {
    console.error("Failed to get domain orders:", error);
    return [];
  }
}

export async function getDomainRenewalHistory(domainOrderId: number): Promise<DomainRenewalHistoryRow[]> {
  await ensureDomainRenewalHistoryTable();
  try {
    const rows = await sql`
      SELECT h.*, i.payment_status
      FROM domain_renewal_history h
      LEFT JOIN invoices i ON h.invoice_id = i.invoice_id
      WHERE h.domain_order_id = ${domainOrderId}
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
    console.error("Failed to get domain renewal history:", error);
    return [];
  }
}

export async function getAllRenewalHistory(): Promise<DomainRenewalHistoryRow[]> {
  await ensureDomainRenewalHistoryTable();
  try {
    const rows = await sql`
      SELECT h.*, i.payment_status
      FROM domain_renewal_history h
      LEFT JOIN invoices i ON h.invoice_id = i.invoice_id
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
  await ensureDomainOrdersTable();
  try {
    await sql`
      INSERT INTO admin_domain_orders (
        client_email, domain_name, actual_price, selling_price, profit, renewal_cost, renewal_price, registrar, expiry_date, status, invoice_id
      ) VALUES (
        ${order.client_email}, ${order.domain_name}, ${order.actual_price}, ${order.selling_price}, 
        ${order.profit}, ${order.renewal_cost || null}, ${order.renewal_price || null}, ${order.registrar || 'Internet.bs'}, ${order.expiry_date || null}, ${order.status}, ${order.invoice_id}
      )
    `;
    await logSystemAction(`Domain order placed: "${order.domain_name}" for client "${order.client_email}"`);
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
  await ensureDomainOrdersTable();
  await ensureDomainRenewalHistoryTable();
  try {
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    const renewalPrice = parseFloat(o.renewal_price || o.selling_price || 0);
    if (renewalPrice <= 0) {
      return { success: false, error: "Renewal price is not configured for this domain" };
    }

    // Fetch live LKR rate — this will be locked into the renewal history row
    const lkrRate = await getUsdToLkrRate();
    const lkrPrice = parseFloat((renewalPrice * lkrRate).toFixed(2));

    let finalPrice = renewalPrice;
    const invCurrency = currency;

    if (currency === "LKR") {
      finalPrice = lkrPrice;
    }

    const num = Math.floor(100000 + Math.random() * 900000);
    const invoiceId = `INV-${num}`;

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
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update domain order status:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteDomainOrder(id: number): Promise<SimpleActionResult> {
  try {
    await sql`
      DELETE FROM admin_domain_orders
      WHERE id = ${id}
    `;
    await logSystemAction(`Domain order deleted (ID: ${id})`);
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
        status = COALESCE(${order.status}, status)
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
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update domain order:", err);
    return { success: false, error: err.message };
  }
}

export async function createDomainInvoice(
  id: number,
  currency: 'USD' | 'LKR'
): Promise<CreateInvoiceResult> {
  await ensureDomainOrdersTable();
  await ensureDomainRenewalHistoryTable();
  try {
    // 1. Fetch domain order details
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    const sellingPriceUsd = parseFloat(o.selling_price);
    const actualPriceUsd = parseFloat(o.actual_price);

    // 2. Fetch live LKR rate and lock it in
    const lkrRate = await getUsdToLkrRate();
    const lkrSellingPrice = parseFloat((sellingPriceUsd * lkrRate).toFixed(2));
    const lkrActualPrice = parseFloat((actualPriceUsd * lkrRate).toFixed(2));

    // 3. Calculate final invoice price based on selected currency
    let finalSellingPrice = sellingPriceUsd;
    const invCurrency = currency;
    
    if (currency === "LKR") {
      finalSellingPrice = lkrSellingPrice;
    }

    // 4. Generate unique invoice ID
    const num = Math.floor(100000 + Math.random() * 900000);
    const invoiceId = `INV-${num}`;

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
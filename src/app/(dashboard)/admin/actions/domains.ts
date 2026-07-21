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
}

/**
 * Plain (non-generic) discriminated-union result types for server actions.
 * Declaring these explicitly, and as flat object literal unions rather than
 * a generic/intersection type, keeps `success` as a literal `true`/`false`
 * and ensures TypeScript can correctly narrow `res` in
 * `if (res.success) {...} else {...}`, exposing `res.error` only on the
 * false branch. (A generic `{ success: true } & T | { success: false }`
 * form looks equivalent but TS does not reliably narrow through the
 * intersection, which is what caused the original build error.)
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

export async function ensureDomainOrdersTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_domain_orders (
          id SERIAL PRIMARY KEY,
          client_email VARCHAR(255) NOT NULL,
          domain_name VARCHAR(255) NOT NULL,
          actual_price NUMERIC(12, 2) NOT NULL,
          selling_price NUMERIC(12, 2) NOT NULL,
          profit NUMERIC(12, 2) NOT NULL,
          purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expiry_date TIMESTAMP,
          status VARCHAR(50) DEFAULT 'pending',
          invoice_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS renewal_cost NUMERIC(12, 2)`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS renewal_price NUMERIC(12, 2)`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ADD COLUMN IF NOT EXISTS registrar VARCHAR(100) DEFAULT 'Internet.bs'`; } catch(e){}
    try { await sql`ALTER TABLE admin_domain_orders ALTER COLUMN expiry_date DROP NOT NULL`; } catch(e){}
  } catch (err: any) {
    console.error("Migration: failed to create admin_domain_orders table", err);
  }
}

export async function getDomainOrders(): Promise<DomainOrder[]> {
  await ensureDomainOrdersTable();
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
      created_at: r.created_at ? new Date(r.created_at).toISOString() : ''
    }));
  } catch (error) {
    console.error("Failed to get domain orders:", error);
    return [];
  }
}

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

export async function createDomainRenewalInvoice(id: number, currency: "USD" | "LKR" = "USD"): Promise<DomainExpiryResult> {
  await ensureDomainOrdersTable();
  try {
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    const renewalPrice = parseFloat(o.renewal_price || o.selling_price || 0);
    if (renewalPrice <= 0) {
      return { success: false, error: "Renewal price is not configured for this domain" };
    }

    let finalPrice = renewalPrice;
    const invCurrency = currency;

    if (currency === "LKR") {
      const lkrRate = await getUsdToLkrRate();
      finalPrice = parseFloat((renewalPrice * lkrRate).toFixed(2));
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
  try {
    // 1. Fetch domain order details
    const orders = await sql`SELECT * FROM admin_domain_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    // 2. Calculate selling price in LKR if LKR is selected
    let finalSellingPrice = parseFloat(o.selling_price);
    let invCurrency = currency;
    
    if (currency === "LKR") {
      const lkrRate = await getUsdToLkrRate();
      finalSellingPrice = parseFloat((finalSellingPrice * lkrRate).toFixed(2));
    }

    // 3. Generate unique invoice ID
    const num = Math.floor(100000 + Math.random() * 900000);
    const invoiceId = `INV-${num}`;

    // 4. Insert parent invoice
    // Insert Invoice
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

    // Insert Invoice Item
    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
      VALUES (${invoiceId}, ${`1 Year Registration for ${o.domain_name}`}, 1, ${finalSellingPrice}, ${finalSellingPrice})
    `;

    // 5. Update domain order, link invoice_id (status remains pending)
    await sql`
      UPDATE admin_domain_orders
      SET invoice_id = ${invoiceId}
      WHERE id = ${id}
    `;

    await logSystemAction(`Domain invoice generated (ID: ${id}, Inv: ${invoiceId})`);
    return { success: true, invoiceId };
  } catch (err: any) {
    console.error("Failed to create domain invoice:", err);
    return { success: false, error: err.message };
  }
}
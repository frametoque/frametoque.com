"use server";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { generateUniqueInvoiceId } from "./actions";

export interface SaaSOrder {
  id: number;
  client_email: string;
  product_name: string;
  price: number;
  billing_cycle: string;
  billing_date: string | null;
  status: string;
  agreement_id: string | null;
  invoice_id: string | null;
  system_url: string | null;
  demo_url: string | null;
  created_at: string;
}

export async function getSaaSOrders(): Promise<SaaSOrder[]> {
  try {
    const rows = await sql`
      SELECT * FROM admin_saas_orders
      ORDER BY 
        COALESCE(billing_date, created_at) DESC,
        id DESC
    `;

    return rows.map((r: any) => ({
      ...r,
      price: parseFloat(r.price || 0),
      billing_date: r.billing_date ? new Date(r.billing_date).toISOString() : '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      agreement_id: r.agreement_id || null,
      invoice_id: r.invoice_id || null,
      system_url: r.system_url || null,
      demo_url: r.demo_url || null,
    }));
  } catch (error) {
    console.error("Failed to get SaaS orders:", error);
    return [];
  }
}

export async function getSaaSOrderById(id: number): Promise<SaaSOrder | null> {
  try {
    const rows = await sql`SELECT * FROM admin_saas_orders WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return rows[0] as SaaSOrder;
  } catch (err: any) {
    console.error("Failed to fetch SaaS order by ID:", err);
    return null;
  }
}

export async function getClientSaaSOrders(email: string): Promise<any[]> {
  try {
    const rows = await sql`
      SELECT o.*, i.payment_status, i.total_due, i.currency
      FROM admin_saas_orders o
      LEFT JOIN invoices i ON o.invoice_id = i.invoice_id
      WHERE o.client_email = ${email}
      ORDER BY 
        COALESCE(o.billing_date, o.created_at) DESC,
        o.id DESC
    `;

    return rows.map((r: any) => ({
      ...r,
      price: parseFloat(r.price || 0),
      billing_date: r.billing_date ? new Date(r.billing_date).toISOString() : '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      agreement_id: r.agreement_id || null,
      invoice_id: r.invoice_id || null,
      system_url: r.system_url || null,
      demo_url: r.demo_url || null,
      payment_status: r.payment_status || null,
      total_due: r.total_due || null,
      currency: r.currency || null,
    }));
  } catch (error) {
    console.error("Failed to get client SaaS orders:", error);
    return [];
  }
}

export async function addSaaSOrder(
  order: Omit<SaaSOrder, "id" | "created_at">
): Promise<{ success: boolean; error?: string }> {
  try {
    const billingDate = order.billing_date ? order.billing_date.split("T")[0] : null;

    await sql`
      INSERT INTO admin_saas_orders (
        client_email, product_name, price, billing_cycle, 
        billing_date, status, agreement_id, invoice_id, system_url, demo_url
      ) VALUES (
        ${order.client_email}, ${order.product_name}, ${order.price || 0}, ${order.billing_cycle || 'monthly'}, 
        ${billingDate || null}, ${order.status}, ${order.agreement_id || null}, ${order.invoice_id || null}, ${order.system_url || null}, ${order.demo_url || null}
      )
    `;
    await logSystemAction(`SaaS order placed: "${order.product_name}" for client "${order.client_email}"`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to add SaaS order:", err);
    return { success: false, error: err.message };
  }
}

export async function updateSaaSOrder(
  id: number,
  order: Partial<SaaSOrder>
): Promise<{ success: boolean; error?: string }> {
  try {
    const billingDate = order.billing_date ? order.billing_date.split("T")[0] : null;

    await sql`
      UPDATE admin_saas_orders
      SET 
        client_email = COALESCE(${order.client_email}, client_email),
        product_name = COALESCE(${order.product_name}, product_name),
        price = COALESCE(${order.price}, price),
        billing_cycle = COALESCE(${order.billing_cycle}, billing_cycle),
        billing_date = ${billingDate ? billingDate + " 00:00:00" : null}::timestamp,
        status = COALESCE(${order.status}, status),
        agreement_id = COALESCE(${order.agreement_id}, agreement_id),
        invoice_id = COALESCE(${order.invoice_id}, invoice_id),
        system_url = COALESCE(${order.system_url}, system_url),
        demo_url = COALESCE(${order.demo_url}, demo_url)
      WHERE id = ${id}
    `;

    await logSystemAction(`SaaS order updated (ID: ${id})`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update SaaS order:", err);
    return { success: false, error: err.message };
  }
}

export async function updateSaaSOrderStatus(
  id: number,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`UPDATE admin_saas_orders SET status = ${newStatus} WHERE id = ${id}`;
    await logSystemAction(`SaaS order status updated to ${newStatus} (ID: ${id})`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update SaaS order status:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteSaaSOrder(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM admin_saas_orders WHERE id = ${id}`;
    await logSystemAction(`Deleted SaaS order ID ${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete SaaS order:", err);
    return { success: false, error: err.message };
  }
}

export async function createSaaSInvoice(
  id: number,
  currency: 'USD' | 'LKR' = 'USD'
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const orders = await sql`SELECT * FROM admin_saas_orders WHERE id = ${id}`;
    if (orders.length === 0) return { success: false, error: "Order not found" };
    const o = orders[0];

    const price = parseFloat(o.price);

    let finalPrice = price;
    if (currency === 'USD') {
      finalPrice = price / 300; 
    }

    const invoiceId = await generateUniqueInvoiceId();

    await sql`
      INSERT INTO invoices (
        invoice_id, user_email, project_name, date, 
        subtotal, discount, total, advance, total_due, 
        work_status, payment_status, currency, category
      ) VALUES (
        ${invoiceId}, ${o.client_email},
        ${`SaaS Subscription: ${o.product_name}`}, ${o.billing_date || new Date().toISOString().split('T')[0]},
        ${finalPrice}, 0, ${finalPrice}, 0, ${finalPrice},
        'completed', 'unpaid', ${currency}, 'SaaS'
      )
    `;

    await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
      VALUES (${invoiceId}, ${`${o.billing_cycle === 'yearly' ? '1 Year' : '1 Month'} Subscription for ${o.product_name}`}, 1, ${finalPrice}, ${finalPrice})
    `;

    let nextBillingDateStr = o.billing_date || new Date().toISOString().split('T')[0];
    if (o.billing_date) {
      const d = new Date(o.billing_date);
      if (o.billing_cycle === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else if (o.billing_cycle === 'yearly') {
        d.setFullYear(d.getFullYear() + 1);
      }
      nextBillingDateStr = d.toISOString().split('T')[0];
    }

    await sql`
      UPDATE admin_saas_orders 
      SET invoice_id = ${invoiceId}, billing_date = ${nextBillingDateStr}
      WHERE id = ${id}
    `;

    await logSystemAction(`Created SaaS invoice ${invoiceId} for ${o.product_name}`);
    return { success: true, invoiceId };
  } catch (err: any) {
    console.error("Failed to create SaaS invoice:", err);
    return { success: false, error: err.message };
  }
}
export async function getSaaSProducts(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT product_name FROM admin_saas_orders WHERE product_name IS NOT NULL AND product_name != '' ORDER BY product_name ASC
    `;
    return rows.map((r: any) => r.product_name);
  } catch (error) {
    console.error("Failed to get distinct SaaS products:", error);
    return [];
  }
}

export async function getTotalSaaSRevenueSoFar(): Promise<number> {
  try {
    const rows = await sql`
      SELECT SUM(total) as total_sum 
      FROM invoices 
      WHERE category = 'SaaS' AND payment_status = 'paid'
    `;
    return parseFloat(rows[0]?.total_sum || 0);
  } catch (e) {
    console.error("Failed to get total SaaS revenue so far:", e);
    return 0;
  }
}

export async function getSaaSInvoices(): Promise<any[]> {
  try {
    return await sql`
      SELECT invoice_id, project_name, total, date, payment_status, user_email, currency
      FROM invoices
      WHERE category = 'SaaS'
      ORDER BY date DESC, created_at DESC
    `;
  } catch (error) {
    console.error("Failed to get SaaS invoices:", error);
    return [];
  }
}


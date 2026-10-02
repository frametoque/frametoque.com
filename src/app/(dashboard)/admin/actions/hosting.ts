"use server";
import { auth } from "@clerk/nextjs/server";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";

export interface HostingOrder {
  id: number;
  client_email: string;
  domain_name: string;
  hosting_provider: string;
  actual_price: number;
  actual_price_currency: string;
  selling_price: number;
  selling_price_currency: string;
  profit: number;
  billing_cycle: string;
  purchase_date: string;
  expiry_date: string;
  status: string;
  invoice_id: string | null;
  provider_invoice_url?: string | null;
  created_at: string;
  renewal_cost?: number;
  renewal_price?: number;
  activation_lkr_rate?: number | null;
  renewal_invoices?: Array<{ url: string; note: string; date: string }>;
  is_free?: boolean;
  vercel_email?: string | null;
}

export async function getHostingOrders(): Promise<HostingOrder[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const rows = await sql`
      SELECT * FROM admin_hosting_orders
      ORDER BY 
        COALESCE(expiry_date, purchase_date, created_at) DESC,
        id DESC
    `;

    return rows.map((r: any) => ({
      ...r,
      actual_price: parseFloat(r.actual_price || 0),
      selling_price: parseFloat(r.selling_price || 0),
      profit: parseFloat(r.profit || 0),
      purchase_date: r.purchase_date ? new Date(r.purchase_date).toISOString() : '',
      expiry_date: r.expiry_date ? new Date(r.expiry_date).toISOString() : '',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      provider_invoice_url: r.provider_invoice_url || null,
      actual_price_currency: r.actual_price_currency || 'USD',
      selling_price_currency: r.selling_price_currency || 'LKR',
      renewal_cost: r.renewal_cost ? parseFloat(r.renewal_cost) : 0,
      renewal_price: r.renewal_price ? parseFloat(r.renewal_price) : 0,
      activation_lkr_rate: r.activation_lkr_rate ? parseFloat(r.activation_lkr_rate) : null,
      renewal_invoices: Array.isArray(r.renewal_invoices)
        ? r.renewal_invoices
        : (r.renewal_invoices ? JSON.parse(r.renewal_invoices) : []),
      is_free: !!r.is_free,
      vercel_email: r.vercel_email || null,
    }));
  } catch (error) {
    console.error("Failed to get hosting orders:", error);
    return [];
  }
}

export async function addHostingOrder(
  order: Omit<HostingOrder, "id" | "created_at">
): Promise<{ success: boolean; error?: string }> {
  try {
    const purchaseDate = order.purchase_date ? order.purchase_date.split("T")[0] : null;
    const expiryDate = order.expiry_date ? order.expiry_date.split("T")[0] : null;

    await sql`
      INSERT INTO admin_hosting_orders (
        client_email, domain_name, hosting_provider, actual_price, actual_price_currency, 
        selling_price, selling_price_currency, profit, billing_cycle, purchase_date, expiry_date, status, invoice_id, provider_invoice_url,
        renewal_cost, renewal_price, activation_lkr_rate, is_free, vercel_email
      ) VALUES (
        ${order.client_email}, ${order.domain_name}, ${order.hosting_provider}, ${order.actual_price || 0}, ${order.actual_price_currency || 'USD'}, 
        ${order.selling_price || 0}, ${order.selling_price_currency || 'LKR'}, ${order.profit || 0}, ${order.billing_cycle || 'yearly'}, 
        ${purchaseDate || null}, ${expiryDate || null}, ${order.status}, ${order.invoice_id || null}, ${order.provider_invoice_url || null},
        ${order.renewal_cost || 0}, ${order.renewal_price || 0}, ${order.activation_lkr_rate || null},
        ${order.is_free || false}, ${order.vercel_email || null}
      )
    `;
    await logSystemAction(`Hosting order placed: "${order.domain_name}" for client "${order.client_email}"`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to add hosting order:", err);
    return { success: false, error: err.message };
  }
}

export async function updateHostingOrder(
  id: number,
  order: Partial<HostingOrder>
): Promise<{ success: boolean; error?: string }> {
  try {
    const purchaseDate = order.purchase_date ? order.purchase_date.split("T")[0] : null;
    const expiryDate = order.expiry_date ? order.expiry_date.split("T")[0] : null;

    await sql`
      UPDATE admin_hosting_orders
      SET 
        client_email = COALESCE(${order.client_email}, client_email),
        domain_name = COALESCE(${order.domain_name}, domain_name),
        hosting_provider = COALESCE(${order.hosting_provider}, hosting_provider),
        actual_price = COALESCE(${order.actual_price}, actual_price),
        actual_price_currency = COALESCE(${order.actual_price_currency}, actual_price_currency),
        selling_price = COALESCE(${order.selling_price}, selling_price),
        selling_price_currency = COALESCE(${order.selling_price_currency}, selling_price_currency),
        profit = COALESCE(${order.profit}, profit),
        billing_cycle = COALESCE(${order.billing_cycle}, billing_cycle),
        purchase_date = COALESCE(${purchaseDate ? purchaseDate + " 00:00:00" : null}::timestamp, purchase_date),
        expiry_date = ${expiryDate ? expiryDate + " 00:00:00" : null}::timestamp,
        status = COALESCE(${order.status}, status),
        invoice_id = COALESCE(${order.invoice_id}, invoice_id),
        provider_invoice_url = COALESCE(${order.provider_invoice_url}, provider_invoice_url),
        renewal_cost = COALESCE(${order.renewal_cost}, renewal_cost),
        renewal_price = COALESCE(${order.renewal_price}, renewal_price),
        activation_lkr_rate = COALESCE(${order.activation_lkr_rate}, activation_lkr_rate),
        is_free = COALESCE(${order.is_free}, is_free),
        vercel_email = ${order.vercel_email !== undefined ? order.vercel_email : null}
      WHERE id = ${id}
    `;

    await logSystemAction(`Hosting order updated (ID: ${id})`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update hosting order:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteHostingOrder(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`DELETE FROM admin_hosting_orders WHERE id = ${id}`;
    await logSystemAction(`Deleted hosting order ID ${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete hosting order:", err);
    return { success: false, error: err.message };
  }
}

export async function uploadProviderInvoice(formData: FormData): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');
  try {
    const { put } = await import('@vercel/blob');
    const filename = `admin/hosting-invoices/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const blob = await put(filename, file, { access: 'public' });
    return blob.url;
  } catch (err: any) {
    console.error('Failed to upload hosting provider invoice:', err);
    throw err;
  }
}

export async function uploadRenewalInvoiceForHosting(formData: FormData): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file uploaded');
  try {
    const { put } = await import('@vercel/blob');
    const filename = `admin/hosting-renewal-invoices/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const blob = await put(filename, file, { access: 'public' });
    return blob.url;
  } catch (err: any) {
    console.error('Failed to upload hosting renewal invoice:', err);
    throw err;
  }
}

export async function addHostingRenewalInvoiceUrl(
  orderId: number,
  url: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {

    const entry = JSON.stringify({ url, note: note || '', date: new Date().toISOString() });
    await sql`
      UPDATE admin_hosting_orders
      SET renewal_invoices = renewal_invoices || ${entry}::jsonb
      WHERE id = ${orderId}
    `;
    await logSystemAction(`Added renewal invoice to hosting order ID ${orderId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to add hosting renewal invoice url:', err);
    return { success: false, error: err.message };
  }
}

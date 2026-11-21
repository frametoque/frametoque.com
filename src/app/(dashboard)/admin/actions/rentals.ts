"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-guard";
import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { createInvoice, createIncome } from "./actions";
import { uploadToR2 } from "@/lib/storage";
import { encryptField, decryptField, generateBlindIndex } from "@/lib/crypto-vault";

let _rentalsSchemaPromise: Promise<void> | null = null;
async function ensureRentalsSchema(): Promise<void> {
  if (_rentalsSchemaPromise) return _rentalsSchemaPromise;

  _rentalsSchemaPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS admin_rentals (
          id SERIAL PRIMARY KEY,
          rental_code VARCHAR(50) UNIQUE NOT NULL,
          inventory_id UUID,
          item_name TEXT NOT NULL,
          client_id TEXT,
          client_name TEXT NOT NULL,
          client_email TEXT,
          client_phone TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          return_date DATE,
          daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
          rental_days INTEGER NOT NULL DEFAULT 1,
          quantity INTEGER NOT NULL DEFAULT 1,
          total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          deposit_amount NUMERIC(12, 2) DEFAULT 0,
          status VARCHAR(30) NOT NULL DEFAULT 'Active',
          payment_status VARCHAR(30) NOT NULL DEFAULT 'Unpaid',
          paid_amount NUMERIC(12, 2) DEFAULT 0,
          invoice_id TEXT,
          income_id TEXT,
          notes TEXT,
          terms TEXT,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
      `;

      // Ensure all columns exist in case table was created with earlier partial schema
      await sql`
        ALTER TABLE admin_rentals 
          ADD COLUMN IF NOT EXISTS inventory_id UUID,
          ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12, 2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS rental_days INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Active',
          ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'Unpaid',
          ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS invoice_id TEXT,
          ADD COLUMN IF NOT EXISTS income_id TEXT,
          ADD COLUMN IF NOT EXISTS notes TEXT,
          ADD COLUMN IF NOT EXISTS return_date DATE,
          ADD COLUMN IF NOT EXISTS client_phone_encrypted TEXT,
          ADD COLUMN IF NOT EXISTS client_phone_bidx TEXT;
      `;

      try {
        await sql`
          ALTER TABLE admin_rentals 
            ALTER COLUMN inventory_id TYPE UUID USING (
              CASE WHEN inventory_id IS NOT NULL THEN inventory_id::text::uuid ELSE NULL END
            )
        `;
      } catch {}

      try {
        await sql`ALTER TABLE admin_rentals ENABLE ROW LEVEL SECURITY`;
      } catch {}

      try {
        await sql`
          ALTER TABLE admin_inventory 
            ADD COLUMN IF NOT EXISTS image_url TEXT,
            ADD COLUMN IF NOT EXISTS images TEXT,
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS item_condition TEXT DEFAULT 'Brand New',
            ADD COLUMN IF NOT EXISTS available_for_rent BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS rental_price_per_day NUMERIC(12, 2) DEFAULT 0;
        `;
      } catch {}
    } catch (e) {
      console.warn("Could not ensure admin_rentals schema:", e);
    }
  })();

  return _rentalsSchemaPromise;
}

export async function generateRentalCode(offset: number = 0): Promise<string> {
  await requireAdminSession();
  await ensureRentalsSchema();

  try {
    const existing = await sql`
      SELECT rental_code 
      FROM admin_rentals 
      WHERE rental_code LIKE 'RNT-%'
    `;

    const usedIds = existing
      .map(row => {
        const match = row.rental_code ? String(row.rental_code).match(/RNT-(\d+)/) : null;
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter(num => !isNaN(num));

    const usedSet = new Set(usedIds);
    let candidate = 1;
    const availableSlots: number[] = [];

    while (availableSlots.length <= offset) {
      if (!usedSet.has(candidate)) {
        availableSlots.push(candidate);
      }
      candidate++;
    }

    const nextId = availableSlots[offset] || candidate;
    return `RNT-${String(nextId).padStart(4, '0')}`;
  } catch (err) {
    console.error("Failed to generate sequential rental code:", err);
    return `RNT-${String(1 + offset).padStart(4, '0')}`;
  }
}

export async function getRentals() {
  await requireAdminSession();
  await ensureRentalsSchema();

  try {
    const rows = await sql`
      SELECT 
        r.*,
        i.serial_number as inventory_serial,
        i.category as inventory_category,
        i.status as inventory_status,
        c.company as client_company,
        c.phone as client_profile_phone,
        inv.payment_status as invoice_payment_status,
        inv.total_due as invoice_total_due
      FROM admin_rentals r
      LEFT JOIN admin_inventory i ON r.inventory_id = i.id
      LEFT JOIN admin_clients c ON r.client_id = c.id
      LEFT JOIN invoices inv ON r.invoice_id = inv.invoice_id
      ORDER BY r.created_at DESC
    `;

    const todayStr = new Date().toISOString().split('T')[0];

    return rows.map((r: any) => {
      const endDateStr = r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : '';
      const startDateStr = r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '';

      let computedStatus = r.status;
      if (r.status === 'Returned' || r.return_date) {
        computedStatus = 'Returned';
      } else if (endDateStr && endDateStr < todayStr) {
        computedStatus = 'Overdue';
      } else if (startDateStr && startDateStr > todayStr) {
        computedStatus = 'Reserved';
      } else {
        computedStatus = 'Active';
      }
      const isOverdue = computedStatus === 'Overdue';

      let paymentStatus = r.payment_status || 'Unpaid';
      let paidAmount = parseFloat(r.paid_amount || '0');

      if (r.invoice_id && r.invoice_payment_status) {
        const invStatus = (r.invoice_payment_status || '').toLowerCase().trim();
        const invDue = r.invoice_total_due !== null ? parseFloat(r.invoice_total_due) : null;
        if (invStatus === 'fully paid' || invStatus === 'paid' || (invDue !== null && invDue < 0.01)) {
          paymentStatus = 'Paid';
          paidAmount = parseFloat(r.total_amount || '0');
        } else if (invStatus === 'partially paid' || invStatus === 'advance-paid') {
          paymentStatus = 'Partially Paid';
          if (invDue !== null) {
            paidAmount = Math.max(paidAmount, Math.max(0, parseFloat(r.total_amount || '0') - invDue));
          }
        }
      }

      return {
        id: r.id,
        rental_code: r.rental_code,
        inventory_id: r.inventory_id,
        item_name: r.item_name,
        inventory_serial: r.inventory_serial || null,
        inventory_category: r.inventory_category || null,
        client_id: r.client_id,
        client_name: r.client_name,
        client_email: r.client_email,
        client_phone: (r.client_phone_encrypted ? decryptField(r.client_phone_encrypted, `rentals:phone:${r.rental_code || r.id}`) : null) || r.client_phone || r.client_profile_phone || null,
        client_company: r.client_company || null,
        start_date: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
        end_date: endDateStr,
        return_date: r.return_date ? new Date(r.return_date).toISOString().split('T')[0] : null,
        daily_rate: parseFloat(r.daily_rate || '0'),
        rental_days: parseInt(r.rental_days || '1', 10),
        quantity: parseInt(r.quantity || '1', 10),
        total_amount: parseFloat(r.total_amount || '0'),
        deposit_amount: parseFloat(r.deposit_amount || '0'),
        status: computedStatus,
        raw_status: r.status,
        is_overdue: isOverdue,
        payment_status: paymentStatus,
        paid_amount: paidAmount,
        invoice_id: r.invoice_id || null,
        invoice_payment_status: r.invoice_payment_status || null,
        invoice_total_due: r.invoice_total_due !== null ? parseFloat(r.invoice_total_due) : null,
        income_id: r.income_id || null,
        notes: r.notes || '',
        terms: r.terms || '',
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });
  } catch (err) {
    console.error("Failed to get rentals:", err);
    return [];
  }
}

export async function getRentalById(id: number | string) {
  await requireAdminSession();
  await ensureRentalsSchema();

  try {
    const rows = await sql`
      SELECT 
        r.*,
        i.serial_number as inventory_serial,
        i.category as inventory_category,
        c.company as client_company,
        c.phone as client_profile_phone,
        inv.payment_status as invoice_payment_status,
        inv.total_due as invoice_total_due
      FROM admin_rentals r
      LEFT JOIN admin_inventory i ON r.inventory_id = i.id
      LEFT JOIN admin_clients c ON r.client_id = c.id
      LEFT JOIN invoices inv ON r.invoice_id = inv.invoice_id
      WHERE r.id = ${id}
    `;

    if (rows.length === 0) return null;
    const r = rows[0];

    let paymentStatus = r.payment_status || 'Unpaid';
    let paidAmount = parseFloat(r.paid_amount || '0');

    if (r.invoice_id && r.invoice_payment_status) {
      const invStatus = (r.invoice_payment_status || '').toLowerCase().trim();
      const invDue = r.invoice_total_due !== null ? parseFloat(r.invoice_total_due) : null;
      if (invStatus === 'fully paid' || invStatus === 'paid' || (invDue !== null && invDue < 0.01)) {
        paymentStatus = 'Paid';
        paidAmount = parseFloat(r.total_amount || '0');
      } else if (invStatus === 'partially paid' || invStatus === 'advance-paid') {
        paymentStatus = 'Partially Paid';
        if (invDue !== null) {
          paidAmount = Math.max(paidAmount, Math.max(0, parseFloat(r.total_amount || '0') - invDue));
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const endDateStr = r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : '';
    const startDateStr = r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '';

    let computedStatus = r.status;
    if (r.status === 'Returned' || r.return_date) {
      computedStatus = 'Returned';
    } else if (endDateStr && endDateStr < todayStr) {
      computedStatus = 'Overdue';
    } else if (startDateStr && startDateStr > todayStr) {
      computedStatus = 'Reserved';
    } else {
      computedStatus = 'Active';
    }

    let relatedRentals: any[] = [];
    if (r.invoice_id) {
      relatedRentals = await sql`
        SELECT 
          r.*,
          i.serial_number as inventory_serial,
          i.category as inventory_category
        FROM admin_rentals r
        LEFT JOIN admin_inventory i ON r.inventory_id = i.id
        WHERE r.invoice_id = ${r.invoice_id} AND r.id != ${r.id}
        ORDER BY r.id ASC
      `;
    }

    return {
      id: r.id,
      rental_code: r.rental_code,
      inventory_id: r.inventory_id,
      item_name: r.item_name,
      inventory_serial: r.inventory_serial || null,
      inventory_category: r.inventory_category || null,
      client_id: r.client_id,
      client_name: r.client_name,
      client_email: r.client_email,
      client_phone: (r.client_phone_encrypted ? decryptField(r.client_phone_encrypted, `rentals:phone:${r.rental_code || r.id}`) : null) || r.client_phone || r.client_profile_phone || null,
      client_company: r.client_company || null,
      start_date: startDateStr,
      end_date: endDateStr,
      return_date: r.return_date ? new Date(r.return_date).toISOString().split('T')[0] : null,
      daily_rate: parseFloat(r.daily_rate || '0'),
      rental_days: parseInt(r.rental_days || '1', 10),
      quantity: parseInt(r.quantity || '1', 10),
      total_amount: parseFloat(r.total_amount || '0'),
      deposit_amount: parseFloat(r.deposit_amount || '0'),
      status: computedStatus,
      payment_status: paymentStatus,
      paid_amount: paidAmount,
      invoice_id: r.invoice_id || null,
      invoice_payment_status: r.invoice_payment_status || null,
      invoice_total_due: r.invoice_total_due !== null ? parseFloat(r.invoice_total_due) : null,
      income_id: r.income_id || null,
      notes: r.notes || '',
      terms: r.terms || '',
      related_items: relatedRentals.map((rel: any) => ({
        id: rel.id,
        rental_code: rel.rental_code,
        inventory_id: rel.inventory_id ? String(rel.inventory_id) : "",
        item_name: rel.item_name,
        daily_rate: parseFloat(rel.daily_rate || '0'),
        rental_days: parseInt(rel.rental_days || '1', 10),
        quantity: parseInt(rel.quantity || '1', 10),
        total_amount: parseFloat(rel.total_amount || '0')
      })),
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  } catch (err) {
    console.error("Failed to get rental by id:", err);
    return null;
  }
}

export async function getRentableInventory() {
  await requireAdminSession();
  await ensureRentalsSchema();

  try {
    const items = await sql`
      SELECT 
        i.*,
        r.rental_code as active_rental_code,
        r.client_name as active_renter,
        r.end_date as active_rental_end_date,
        COALESCE(rev.total_revenue, 0) as total_revenue,
        COALESCE(rev.rental_count, 0) as rental_count
      FROM admin_inventory i
      LEFT JOIN (
        SELECT inventory_id, rental_code, client_name, end_date
        FROM admin_rentals
        WHERE status = 'Active'
      ) r ON i.id = r.inventory_id
      LEFT JOIN (
        SELECT 
          COALESCE(r2.inventory_id, i2.id) as matched_inv_id,
          SUM(
            CASE 
              WHEN r2.payment_status = 'Paid' THEN r2.total_amount
              ELSE COALESCE(r2.paid_amount, 0)
            END
          ) as total_revenue,
          COUNT(*) as rental_count
        FROM admin_rentals r2
        LEFT JOIN admin_inventory i2 ON LOWER(TRIM(r2.item_name)) = LOWER(TRIM(i2.item_name))
        GROUP BY COALESCE(r2.inventory_id, i2.id)
      ) rev ON i.id = rev.matched_inv_id
      WHERE COALESCE(i.is_to_buy, false) = false
        AND COALESCE(i.available_for_rent, false) = true
      ORDER BY i.item_name ASC
    `;

    return items.map((item: any) => ({
      id: item.id,
      item_name: item.item_name,
      category: item.category,
      serial_number: item.serial_number,
      quantity: item.quantity,
      status: item.status,
      purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : 0,
      rental_price_per_day: item.rental_price_per_day ? parseFloat(item.rental_price_per_day) : 0,
      available_for_rent: Boolean(item.available_for_rent),
      is_currently_out: Boolean(item.active_rental_code),
      active_rental_code: item.active_rental_code || null,
      active_renter: item.active_renter || null,
      active_rental_end_date: item.active_rental_end_date ? new Date(item.active_rental_end_date).toISOString().split('T')[0] : null,
      total_revenue: parseFloat(item.total_revenue || '0'),
      rental_count: parseInt(item.rental_count || '0', 10),
      image_url: item.image_url || null,
      images: item.images || null,
      description: item.description || null,
      item_condition: item.item_condition || 'Brand New'
    }));
  } catch (err) {
    console.error("Failed to get rentable inventory:", err);
    return [];
  }
}

export async function uploadRentalEquipmentImage(formData: FormData): Promise<string> {
  await requireAdminSession();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file uploaded");

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `admin/rentals/equipment/${Date.now()}-${safeName}`;
  const uploaded = await uploadToR2(filename, file, { access: "public" });
  return uploaded.url;
}

export async function uploadMultipleRentalEquipmentImages(formData: FormData): Promise<string[]> {
  await requireAdminSession();

  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) return [];

  const urls: string[] = [];
  for (const file of files) {
    if (file && typeof file === "object" && file.size > 0) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `admin/rentals/equipment/${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${safeName}`;
      const uploaded = await uploadToR2(filename, file, { access: "public" });
      urls.push(uploaded.url);
    }
  }
  return urls;
}

export async function createEquipmentCatalogItem(data: {
  item_name: string;
  category: string;
  rental_price_per_day: number;
  image_url?: string | null;
  images?: string | null;
  description?: string | null;
  item_condition?: string | null;
  quantity?: number;
  available_for_rent?: boolean;
}) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const result = await sql`
    INSERT INTO admin_inventory (
      item_name,
      category,
      status,
      quantity,
      item_condition,
      available_for_rent,
      rental_price_per_day,
      image_url,
      images,
      description,
      is_to_buy
    ) VALUES (
      ${data.item_name},
      ${data.category || 'Equipment'},
      'Available',
      ${data.quantity || 1},
      ${data.item_condition || 'Brand New'},
      ${data.available_for_rent !== undefined ? Boolean(data.available_for_rent) : true},
      ${parseFloat(String(data.rental_price_per_day || 0))},
      ${data.image_url || null},
      ${data.images || null},
      ${data.description || null},
      false
    )
    RETURNING id, item_name
  `;

  await logSystemAction(`Created rentable equipment catalog item: "${data.item_name}"`);
  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");
  revalidatePath("/rentals");

  return result[0];
}

export async function updateEquipmentCatalogItem(
  id: string,
  data: {
    item_name: string;
    category: string;
    rental_price_per_day: number;
    image_url?: string | null;
    images?: string | null;
    description?: string | null;
    item_condition?: string | null;
    quantity?: number;
    available_for_rent?: boolean;
  }
) {
  await requireAdminSession();
  await ensureRentalsSchema();

  await sql`
    UPDATE admin_inventory SET
      item_name = ${data.item_name},
      category = ${data.category || 'Equipment'},
      item_condition = ${data.item_condition || 'Brand New'},
      rental_price_per_day = ${parseFloat(String(data.rental_price_per_day || 0))},
      image_url = ${data.image_url !== undefined ? data.image_url : null},
      images = ${data.images !== undefined ? data.images : null},
      description = ${data.description !== undefined ? data.description : null},
      quantity = ${data.quantity || 1},
      available_for_rent = ${data.available_for_rent !== undefined ? Boolean(data.available_for_rent) : true},
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  await logSystemAction(`Updated rentable equipment catalog item: "${data.item_name}" (ID: ${id})`);
  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");
  revalidatePath("/rentals");

  return { success: true };
}

export interface DateClashDetail {
  rental_id: number;
  rental_code: string;
  item_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ItemAvailabilityCheck {
  inventory_id?: string | null;
  item_name: string;
  has_clash: boolean;
  clashes: DateClashDetail[];
}

export async function checkRentalAvailability(params: {
  items: Array<{ inventory_id?: string | null; item_name?: string }>;
  start_date: string;
  end_date: string;
  excludeRentalId?: number | null;
  excludeRentalIds?: number[] | null;
}): Promise<ItemAvailabilityCheck[]> {
  await requireAdminSession();
  await ensureRentalsSchema();

  if (!params.start_date || !params.end_date || !params.items || params.items.length === 0) {
    return [];
  }

  const results: ItemAvailabilityCheck[] = [];
  const rawExclude = params.excludeRentalIds || (params.excludeRentalId ? [params.excludeRentalId] : []);
  const excludeIds: number[] = rawExclude.filter((id): id is number => typeof id === "number" && id > 0);

  for (const item of params.items) {
    const invId = item.inventory_id && String(item.inventory_id).trim() ? String(item.inventory_id).trim() : null;
    const itemName = (item.item_name || '').trim();

    if (!invId && !itemName) {
      results.push({
        inventory_id: invId,
        item_name: itemName,
        has_clash: false,
        clashes: []
      });
      continue;
    }

    try {
      let rows: any[] = [];

      if (invId) {
        rows = await sql`
          SELECT id, rental_code, item_name, client_name, start_date, end_date, status
          FROM admin_rentals
          WHERE status IN ('Active', 'Reserved', 'Overdue')
            AND (inventory_id = ${invId}::uuid OR LOWER(TRIM(item_name)) = LOWER(TRIM(${itemName})))
            AND start_date <= ${params.end_date}::date
            AND end_date >= ${params.start_date}::date
            AND (${excludeIds.length === 0} OR NOT (id = ANY(${excludeIds}::int[])))
          ORDER BY start_date ASC
        `;
      } else {
        rows = await sql`
          SELECT id, rental_code, item_name, client_name, start_date, end_date, status
          FROM admin_rentals
          WHERE status IN ('Active', 'Reserved', 'Overdue')
            AND LOWER(TRIM(item_name)) = LOWER(TRIM(${itemName}))
            AND start_date <= ${params.end_date}::date
            AND end_date >= ${params.start_date}::date
            AND (${excludeIds.length === 0} OR NOT (id = ANY(${excludeIds}::int[])))
          ORDER BY start_date ASC
        `;
      }

      const clashes: DateClashDetail[] = rows.map((r: any) => ({
        rental_id: r.id,
        rental_code: r.rental_code,
        item_name: r.item_name,
        client_name: r.client_name,
        start_date: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
        end_date: r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : '',
        status: r.status
      }));

      results.push({
        inventory_id: invId,
        item_name: itemName,
        has_clash: clashes.length > 0,
        clashes
      });
    } catch (err) {
      console.warn("Failed checking rental availability for item:", itemName, err);
      results.push({
        inventory_id: invId,
        item_name: itemName,
        has_clash: false,
        clashes: []
      });
    }
  }

  return results;
}

export interface RentalItemPayload {
  inventory_id?: string | null;
  item_name: string;
  daily_rate: number;
  quantity?: number;
  total_amount?: number;
}

export async function createRental(data: {
  inventory_id?: string | null;
  item_name?: string;
  items?: RentalItemPayload[];
  existing_invoice_id?: string | null;
  client_id?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  start_date: string;
  end_date: string;
  daily_rate?: number;
  rental_days: number;
  quantity?: number;
  total_amount?: number;
  deposit_amount?: number;
  status?: string;
  notes?: string;
  terms?: string;
  auto_create_invoice?: boolean;
  auto_record_income?: boolean;
  initial_payment_amount?: number;
  payment_method?: string;
  bank_account_id?: number | null;
}) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const rentalDays = data.rental_days || 1;

  // Normalize items array: if data.items supplied, use it; otherwise fall back to single item fields
  const rawItems: RentalItemPayload[] = (data.items && data.items.length > 0)
    ? data.items
    : [{
        inventory_id: data.inventory_id || null,
        item_name: data.item_name || 'Equipment Rental',
        daily_rate: data.daily_rate || 0,
        quantity: data.quantity || 1,
        total_amount: data.total_amount || 0
      }];

  const items = rawItems.map(it => {
    const rate = Number(it.daily_rate) || 0;
    const qty = Number(it.quantity) || 1;
    const calculatedTotal = rate * rentalDays * qty;
    return {
      inventory_id: it.inventory_id && String(it.inventory_id).trim() ? String(it.inventory_id).trim() : null,
      item_name: (it.item_name || 'Equipment').trim(),
      daily_rate: rate,
      quantity: qty,
      total_amount: it.total_amount !== undefined && it.total_amount !== null && !isNaN(Number(it.total_amount))
        ? Number(it.total_amount)
        : calculatedTotal
    };
  });

  const grandTotal = items.reduce((sum, it) => sum + it.total_amount, 0) || (data.total_amount || 0);
  const status = data.status || 'Active';
  let paymentStatus = 'Unpaid';
  let paidAmount = 0;
  let linkedInvoiceId: string | null = null;
  const linkedIncomeId: string | null = null;

  // 1. Invoicing: Link to existing invoice OR auto-create one combined invoice
  if (data.existing_invoice_id) {
    try {
      linkedInvoiceId = data.existing_invoice_id;
      // Append each item as line item to this existing invoice
      for (const it of items) {
        const lineDesc = `Rental of ${it.item_name} (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'} @ LKR ${it.daily_rate}/day)`;
        await sql`
          INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
          VALUES (${linkedInvoiceId}, ${lineDesc}, ${it.quantity}, ${it.daily_rate * rentalDays}, ${it.total_amount})
        `;
      }

      // Update invoice totals
      await sql`
        UPDATE invoices 
        SET subtotal = subtotal + ${grandTotal},
            total = total + ${grandTotal},
            total_due = total_due + ${grandTotal}
        WHERE invoice_id = ${linkedInvoiceId}
      `;
    } catch (invErr) {
      console.warn("Could not append rental items to existing invoice:", invErr);
    }
  } else if (data.auto_create_invoice) {
    try {
      const firstCode = await generateRentalCode(0);
      const invoiceProjectName = items.length === 1
        ? `Equipment Rental: ${items[0].item_name} (${firstCode})`
        : `Equipment Rental (${items.length} items) (${firstCode}): ${items.map(i => i.item_name).join(', ')}`;

      const invPayload = {
        projectName: invoiceProjectName,
        date: data.start_date,
        dueDate: data.end_date,
        clientId: data.client_id || null,
        clientName: data.client_name,
        userEmail: data.client_email || null,
        phone: data.client_phone || null,
        subtotal: grandTotal,
        discount: 0,
        total: grandTotal,
        advance: data.deposit_amount || 0,
        totalDue: Math.max(0, grandTotal - (data.deposit_amount || 0)),
        workStatus: 'in progress',
        paymentStatus: (data.deposit_amount || 0) >= grandTotal ? 'fully paid' : ((data.deposit_amount || 0) > 0 ? 'partially paid' : 'unpaid'),
        currency: 'LKR',
        category: 'Rentals',
        bankAccountId: data.bank_account_id || null
      };

      const lineItems = items.map(it => ({
        description: `Rental of ${it.item_name} (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'} @ LKR ${it.daily_rate}/day)`,
        quantity: it.quantity,
        rate: it.daily_rate * rentalDays
      }));

      const invResult = await createInvoice(invPayload, lineItems);
      if (invResult?.invoiceId) {
        linkedInvoiceId = invResult.invoiceId;
      }
    } catch (invErr) {
      console.warn("Could not auto-create combined invoice for rentals:", invErr);
    }
  }

  // 2. Record initial income if requested
  const initialPayment = data.initial_payment_amount !== undefined && data.initial_payment_amount !== null
    ? data.initial_payment_amount
    : (data.auto_record_income ? (data.deposit_amount || grandTotal) : 0);

  if (data.auto_record_income && initialPayment > 0) {
    try {
      paidAmount = initialPayment;
      paymentStatus = paidAmount >= grandTotal ? 'Paid' : 'Partially Paid';

      await createIncome({
        date: data.start_date,
        amount: initialPayment,
        description: `Rental payment: ${items.map(i => i.item_name).join(', ')} (${data.client_name})`,
        category: 'Rentals',
        paymentMethod: data.payment_method || 'Bank Transfer',
        invoiceId: linkedInvoiceId || undefined,
        clientId: data.client_id || undefined,
        accountId: data.bank_account_id || undefined
      });
    } catch (incErr) {
      console.warn("Could not auto-record income for rental:", incErr);
    }
  }

  // 3. Insert each rental row with its own sequential rental_code
  const createdIds: number[] = [];
  const createdCodes: string[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const rentalCode = await generateRentalCode(idx);
    createdCodes.push(rentalCode);

    const itemPaid = grandTotal > 0 ? Math.round((paidAmount / grandTotal) * it.total_amount * 100) / 100 : 0;
    const itemPaymentStatus = itemPaid >= it.total_amount && it.total_amount > 0 ? 'Paid' : (itemPaid > 0 ? 'Partially Paid' : paymentStatus);

    const encPhone = data.client_phone ? encryptField(data.client_phone, `rentals:phone:${rentalCode}`) : null;
    const bidxPhone = data.client_phone ? generateBlindIndex(data.client_phone, "phone") : null;

    let result;
    try {
      result = await sql`
        INSERT INTO admin_rentals (
          rental_code, inventory_id, item_name, client_id, client_name, client_email, client_phone, client_phone_encrypted, client_phone_bidx,
          start_date, end_date, daily_rate, rental_days, quantity, total_amount, deposit_amount,
          status, payment_status, paid_amount, invoice_id, income_id, notes, terms
        ) VALUES (
          ${rentalCode},
          ${it.inventory_id},
          ${it.item_name},
          ${data.client_id || null},
          ${data.client_name},
          ${data.client_email || null},
          ${data.client_phone || null},
          ${encPhone},
          ${bidxPhone},
          ${data.start_date},
          ${data.end_date},
          ${it.daily_rate},
          ${rentalDays},
          ${it.quantity},
          ${it.total_amount},
          ${idx === 0 ? (data.deposit_amount || 0) : 0},
          ${status},
          ${itemPaymentStatus},
          ${itemPaid},
          ${linkedInvoiceId},
          ${linkedIncomeId},
          ${data.notes || null},
          ${data.terms || null}
        )
        RETURNING id
      `;
    } catch {
      result = await sql`
        INSERT INTO admin_rentals (
          rental_code, inventory_id, item_name, client_id, client_name, client_email, client_phone,
          start_date, end_date, daily_rate, rental_days, quantity, total_amount, deposit_amount,
          status, payment_status, paid_amount, invoice_id, income_id, notes, terms
        ) VALUES (
          ${rentalCode},
          ${it.inventory_id},
          ${it.item_name},
          ${data.client_id || null},
          ${data.client_name},
          ${data.client_email || null},
          ${data.client_phone || null},
          ${data.start_date},
          ${data.end_date},
          ${it.daily_rate},
          ${rentalDays},
          ${it.quantity},
          ${it.total_amount},
          ${idx === 0 ? (data.deposit_amount || 0) : 0},
          ${status},
          ${itemPaymentStatus},
          ${itemPaid},
          ${linkedInvoiceId},
          ${linkedIncomeId},
          ${data.notes || null},
          ${data.terms || null}
        )
        RETURNING id
      `;
    }
    createdIds.push(result[0].id);
    await logSystemAction(`Created rental booking: ${rentalCode} for "${it.item_name}" to ${data.client_name}`);
  }

  if (linkedInvoiceId) {
    await syncRentalPaymentStatusForInvoice(linkedInvoiceId);
    revalidatePath("/admin/invoices");
  }

  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");
  if (data.auto_record_income) revalidatePath("/admin/income");

  return {
    success: true,
    id: createdIds[0],
    ids: createdIds,
    rentalCode: createdCodes[0],
    rentalCodes: createdCodes,
    invoiceId: linkedInvoiceId
  };
}

export async function updateRental(id: number, data: {
  inventory_id?: string | null;
  item_name?: string;
  client_id?: string | null;
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  start_date?: string;
  end_date?: string;
  return_date?: string | null;
  daily_rate?: number;
  rental_days?: number;
  quantity?: number;
  total_amount?: number;
  deposit_amount?: number;
  status?: string;
  payment_status?: string;
  paid_amount?: number;
  invoice_id?: string | null;
  notes?: string;
  terms?: string;
}) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const isReturned = data.status === 'Returned';
  const returnDate = isReturned 
    ? (data.return_date || new Date().toISOString().split('T')[0])
    : (data.return_date || null);

  const invId = data.inventory_id !== undefined
    ? (data.inventory_id && String(data.inventory_id).trim() ? String(data.inventory_id).trim() : null)
    : undefined;

  const encPhone = data.client_phone !== undefined
    ? (data.client_phone ? encryptField(data.client_phone, `rentals:phone:${id}`) : null)
    : undefined;
  const bidxPhone = data.client_phone !== undefined
    ? (data.client_phone ? generateBlindIndex(data.client_phone, "phone") : null)
    : undefined;

  try {
    await sql`
      UPDATE admin_rentals SET
        inventory_id = ${invId !== undefined ? invId : sql`inventory_id`},
        item_name = COALESCE(${data.item_name || null}, item_name),
        client_id = COALESCE(${data.client_id !== undefined ? data.client_id : null}, client_id),
        client_name = COALESCE(${data.client_name || null}, client_name),
        client_email = ${data.client_email !== undefined ? data.client_email : null},
        client_phone = ${data.client_phone !== undefined ? data.client_phone : null},
        client_phone_encrypted = ${encPhone !== undefined ? encPhone : sql`client_phone_encrypted`},
        client_phone_bidx = ${bidxPhone !== undefined ? bidxPhone : sql`client_phone_bidx`},
        start_date = COALESCE(${data.start_date || null}, start_date),
        end_date = COALESCE(${data.end_date || null}, end_date),
        return_date = ${returnDate},
        daily_rate = COALESCE(${data.daily_rate !== undefined ? data.daily_rate : null}, daily_rate),
        rental_days = COALESCE(${data.rental_days !== undefined ? data.rental_days : null}, rental_days),
        quantity = COALESCE(${data.quantity !== undefined ? data.quantity : null}, quantity),
        total_amount = COALESCE(${data.total_amount !== undefined ? data.total_amount : null}, total_amount),
        deposit_amount = COALESCE(${data.deposit_amount !== undefined ? data.deposit_amount : null}, deposit_amount),
        status = COALESCE(${data.status || null}, status),
        payment_status = COALESCE(${data.payment_status || null}, payment_status),
        paid_amount = COALESCE(${data.paid_amount !== undefined ? data.paid_amount : null}, paid_amount),
        invoice_id = ${data.invoice_id !== undefined ? data.invoice_id : null},
        notes = ${data.notes !== undefined ? data.notes : null},
        terms = ${data.terms !== undefined ? data.terms : null},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } catch {
    await sql`
      UPDATE admin_rentals SET
        inventory_id = ${invId !== undefined ? invId : sql`inventory_id`},
        item_name = COALESCE(${data.item_name || null}, item_name),
        client_id = COALESCE(${data.client_id !== undefined ? data.client_id : null}, client_id),
        client_name = COALESCE(${data.client_name || null}, client_name),
        client_email = ${data.client_email !== undefined ? data.client_email : null},
        client_phone = ${data.client_phone !== undefined ? data.client_phone : null},
        start_date = COALESCE(${data.start_date || null}, start_date),
        end_date = COALESCE(${data.end_date || null}, end_date),
        return_date = ${returnDate},
        daily_rate = COALESCE(${data.daily_rate !== undefined ? data.daily_rate : null}, daily_rate),
        rental_days = COALESCE(${data.rental_days !== undefined ? data.rental_days : null}, rental_days),
        quantity = COALESCE(${data.quantity !== undefined ? data.quantity : null}, quantity),
        total_amount = COALESCE(${data.total_amount !== undefined ? data.total_amount : null}, total_amount),
        deposit_amount = COALESCE(${data.deposit_amount !== undefined ? data.deposit_amount : null}, deposit_amount),
        status = COALESCE(${data.status || null}, status),
        payment_status = COALESCE(${data.payment_status || null}, payment_status),
        paid_amount = COALESCE(${data.paid_amount !== undefined ? data.paid_amount : null}, paid_amount),
        invoice_id = ${data.invoice_id !== undefined ? data.invoice_id : null},
        notes = ${data.notes !== undefined ? data.notes : null},
        terms = ${data.terms !== undefined ? data.terms : null},
        updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  await logSystemAction(`Updated rental ID ${id} (${data.item_name || 'equipment'})`);

  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function updateRentalWithItems(data: {
  primary_id: number;
  client_id?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  client_company?: string | null;
  start_date: string;
  end_date: string;
  return_date?: string | null;
  rental_days: number;
  deposit_amount?: number;
  status: string;
  notes?: string;
  terms?: string;
  items: Array<{
    id?: number;
    inventory_id?: string | null;
    item_name: string;
    daily_rate: number;
    quantity: number;
    total_amount?: number;
  }>;
  deleted_item_ids?: number[];
}) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const isReturned = data.status === 'Returned';
  const returnDate = isReturned
    ? (data.return_date || new Date().toISOString().split('T')[0])
    : (data.return_date || null);

  const primaryRows = await sql`SELECT * FROM admin_rentals WHERE id = ${data.primary_id}`;
  if (primaryRows.length === 0) {
    throw new Error("Rental booking not found");
  }
  const primary = primaryRows[0];
  const linkedInvoiceId = primary.invoice_id || null;

  // 1. Delete removed sibling rentals
  if (data.deleted_item_ids && data.deleted_item_ids.length > 0) {
    for (const delId of data.deleted_item_ids) {
      if (delId !== data.primary_id) {
        await sql`DELETE FROM admin_rentals WHERE id = ${delId}`;
      }
    }
  }

  // 2. Process each item in items array
  let newItemsCount = 0;
  const processedItems: Array<{ item_name: string; quantity: number; daily_rate: number; total_amount: number }> = [];

  for (let i = 0; i < data.items.length; i++) {
    const it = data.items[i];
    const invId = it.inventory_id && String(it.inventory_id).trim() ? String(it.inventory_id).trim() : null;
    const rate = Number(it.daily_rate) || 0;
    const qty = Number(it.quantity) || 1;
    const calculatedTotal = rate * data.rental_days * qty;
    const totalAmount = it.total_amount !== undefined && it.total_amount !== null && !isNaN(Number(it.total_amount))
      ? Number(it.total_amount)
      : calculatedTotal;

    processedItems.push({
      item_name: it.item_name.trim(),
      quantity: qty,
      daily_rate: rate,
      total_amount: totalAmount
    });

    if (it.id) {
      // Existing item (primary or sibling)
      await sql`
        UPDATE admin_rentals SET
          inventory_id = ${invId},
          item_name = ${it.item_name.trim()},
          client_id = ${data.client_id || null},
          client_name = ${data.client_name.trim()},
          client_email = ${data.client_email ? data.client_email.trim() : null},
          client_phone = ${data.client_phone ? data.client_phone.trim() : null},
          start_date = ${data.start_date},
          end_date = ${data.end_date},
          return_date = ${returnDate},
          daily_rate = ${rate},
          rental_days = ${data.rental_days},
          quantity = ${qty},
          total_amount = ${totalAmount},
          deposit_amount = ${it.id === data.primary_id ? (data.deposit_amount || 0) : 0},
          status = ${data.status},
          notes = ${data.notes ? data.notes.trim() : null},
          terms = ${data.terms ? data.terms.trim() : null},
          updated_at = NOW()
        WHERE id = ${it.id}
      `;
    } else {
      // Newly added item to this booking
      const newCode = await generateRentalCode(newItemsCount++);
      await sql`
        INSERT INTO admin_rentals (
          rental_code,
          inventory_id,
          item_name,
          client_id,
          client_name,
          client_email,
          client_phone,
          start_date,
          end_date,
          return_date,
          daily_rate,
          rental_days,
          quantity,
          total_amount,
          deposit_amount,
          status,
          payment_status,
          paid_amount,
          invoice_id,
          income_id,
          notes,
          terms
        ) VALUES (
          ${newCode},
          ${invId},
          ${it.item_name.trim()},
          ${data.client_id || null},
          ${data.client_name.trim()},
          ${data.client_email ? data.client_email.trim() : null},
          ${data.client_phone ? data.client_phone.trim() : null},
          ${data.start_date},
          ${data.end_date},
          ${returnDate},
          ${rate},
          ${data.rental_days},
          ${qty},
          ${totalAmount},
          0,
          ${data.status},
          ${primary.payment_status || 'Unpaid'},
          0,
          ${linkedInvoiceId},
          ${primary.income_id || null},
          ${data.notes ? data.notes.trim() : null},
          ${data.terms ? data.terms.trim() : null}
        )
      `;
    }
  }

  // 3. If an invoice was linked, sync invoice line items & total
  if (linkedInvoiceId) {
    try {
      await sql`DELETE FROM invoice_items WHERE invoice_id = ${linkedInvoiceId}`;
      for (const pit of processedItems) {
        const itemLineTotal = pit.total_amount;
        const lineDesc = `${pit.item_name} (${data.rental_days} ${data.rental_days === 1 ? 'day' : 'days'})`;
        await sql`
          INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
          VALUES (${linkedInvoiceId}, ${lineDesc}, ${pit.quantity}, ${pit.daily_rate * data.rental_days}, ${itemLineTotal})
        `;
      }
      const newGrandTotal = processedItems.reduce((sum, pit) => sum + pit.total_amount, 0);
      await sql`
        UPDATE invoices
        SET 
          total = ${newGrandTotal},
          total_due = GREATEST(0, ${newGrandTotal} - COALESCE(advance, 0)),
          updated_at = NOW()
        WHERE invoice_id = ${linkedInvoiceId}
      `;
      await syncRentalPaymentStatusForInvoice(linkedInvoiceId);
      revalidatePath("/admin/invoices");
    } catch (invErr) {
      console.warn("Failed updating invoice line items for updated rental:", invErr);
    }
  }

  await logSystemAction(`Updated rental booking ID ${data.primary_id} with ${data.items.length} items`);
  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");

  return { success: true };
}

export async function markRentalReturned(id: number, returnDate?: string, notes?: string) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const actualReturnDate = returnDate || new Date().toISOString().split('T')[0];

  await sql`
    UPDATE admin_rentals SET
      status = 'Returned',
      return_date = ${actualReturnDate},
      notes = CASE WHEN ${notes || null} IS NOT NULL THEN COALESCE(notes || E'\n' || ${notes}, ${notes}) ELSE notes END,
      updated_at = NOW()
    WHERE id = ${id}
  `;

  await logSystemAction(`Marked rental ID ${id} as Returned on ${actualReturnDate}`);

  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function deleteRental(id: number, rentalCode: string) {
  await requireAdminSession();
  await ensureRentalsSchema();

  await sql`DELETE FROM admin_rentals WHERE id = ${id}`;
  await logSystemAction(`Deleted rental booking: ${rentalCode} (ID: ${id})`);

  revalidatePath("/admin/rentals");
  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function generateInvoiceForRental(rentalId: number) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const rows = await sql`SELECT * FROM admin_rentals WHERE id = ${rentalId}`;
  if (rows.length === 0) throw new Error("Rental not found");
  const rental = rows[0];

  if (rental.invoice_id) {
    return { success: true, invoiceId: rental.invoice_id, alreadyExisted: true };
  }

  const startDateStr = rental.start_date ? new Date(rental.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const endDateStr = rental.end_date ? new Date(rental.end_date).toISOString().split('T')[0] : startDateStr;
  const totalAmount = parseFloat(rental.total_amount || '0');
  const deposit = parseFloat(rental.deposit_amount || '0');
  const paid = parseFloat(rental.paid_amount || '0');
  const effectivePaid = Math.max(deposit, paid);

  const invPayload = {
    projectName: `Equipment Rental: ${rental.item_name} (${rental.rental_code})`,
    date: startDateStr,
    dueDate: endDateStr,
    clientId: rental.client_id || null,
    clientName: rental.client_name,
    userEmail: rental.client_email || null,
    phone: rental.client_phone || null,
    subtotal: totalAmount,
    discount: 0,
    total: totalAmount,
    advance: effectivePaid,
    totalDue: Math.max(0, totalAmount - effectivePaid),
    workStatus: rental.status === 'Returned' ? 'completed' : 'in progress',
    paymentStatus: effectivePaid >= totalAmount ? 'fully paid' : (effectivePaid > 0 ? 'partially paid' : 'unpaid'),
    currency: 'LKR',
    category: 'Rentals'
  };

  const lineItems = [
    {
      description: `Rental of ${rental.item_name} (${rental.rental_days || 1} ${(rental.rental_days || 1) === 1 ? 'day' : 'days'} @ LKR ${rental.daily_rate || totalAmount}/day)`,
      quantity: rental.quantity || 1,
      rate: totalAmount / (rental.quantity || 1)
    }
  ];

  const invResult = await createInvoice(invPayload, lineItems);

  if (invResult?.invoiceId) {
    await sql`
      UPDATE admin_rentals 
      SET invoice_id = ${invResult.invoiceId}, updated_at = NOW() 
      WHERE id = ${rentalId}
    `;
    revalidatePath("/admin/rentals");
    revalidatePath("/admin/invoices");
    await logSystemAction(`Generated invoice ${invResult.invoiceId} for rental ${rental.rental_code}`);
    return { success: true, invoiceId: invResult.invoiceId };
  }

  throw new Error("Failed to generate invoice");
}

export async function recordRentalPayment(rentalId: number, data: {
  amount: number;
  paymentMethod: string;
  date: string;
  accountId?: number | null;
  notes?: string;
}) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const rows = await sql`SELECT * FROM admin_rentals WHERE id = ${rentalId}`;
  if (rows.length === 0) throw new Error("Rental not found");
  const rental = rows[0];

  const currentPaid = parseFloat(rental.paid_amount || '0');
  const newPayment = parseFloat(data.amount.toString()) || 0;
  const newTotalPaid = currentPaid + newPayment;
  const totalAmount = parseFloat(rental.total_amount || '0');
  const newPaymentStatus = newTotalPaid >= totalAmount ? 'Paid' : (newTotalPaid > 0 ? 'Partially Paid' : 'Unpaid');

  // Insert into admin_incomes
  await createIncome({
    date: data.date || new Date().toISOString().split('T')[0],
    amount: newPayment,
    description: data.notes || `Rental payment: ${rental.rental_code} - ${rental.item_name} (${rental.client_name})`,
    category: 'Rentals',
    paymentMethod: data.paymentMethod || 'Bank Transfer',
    invoiceId: rental.invoice_id || undefined,
    clientId: rental.client_id || undefined,
    accountId: data.accountId || undefined
  });

  // Update rental record
  await sql`
    UPDATE admin_rentals SET
      paid_amount = ${newTotalPaid},
      payment_status = ${newPaymentStatus},
      updated_at = NOW()
    WHERE id = ${rentalId}
  `;

  if (rental.invoice_id) {
    await syncRentalPaymentStatusForInvoice(rental.invoice_id);
    revalidatePath("/admin/invoices");
  }

  await logSystemAction(`Recorded payment of LKR ${newPayment} for rental ${rental.rental_code}`);

  revalidatePath("/admin/rentals");
  revalidatePath("/admin/income");

  return { success: true, totalPaid: newTotalPaid, paymentStatus: newPaymentStatus };
}

export async function syncRentalPaymentStatusForInvoice(invoiceId: string) {
  if (!invoiceId) return;
  await ensureRentalsSchema();

  try {
    const rentalRows = await sql`
      SELECT id, total_amount, deposit_amount, payment_status, paid_amount 
      FROM admin_rentals 
      WHERE invoice_id = ${invoiceId}
    `;
    if (rentalRows.length === 0) return;

    const invRows = await sql`
      SELECT payment_status, total, total_due, advance 
      FROM invoices 
      WHERE invoice_id = ${invoiceId}
    `;
    if (invRows.length === 0) return;

    const inv = invRows[0];
    const invStatus = (inv.payment_status || '').toLowerCase().trim();
    const invTotal = parseFloat(inv.total || '0');
    const invTotalDue = parseFloat(inv.total_due != null ? inv.total_due : inv.total);
    const invPaid = Math.max(0, invTotal - invTotalDue);

    let newRentalPaymentStatus = 'Unpaid';
    if (invStatus === 'fully paid' || invStatus === 'paid' || invTotalDue < 0.01) {
      newRentalPaymentStatus = 'Paid';
    } else if (invStatus === 'partially paid' || invStatus === 'advance-paid' || invPaid > 0) {
      newRentalPaymentStatus = 'Partially Paid';
    }

    for (const r of rentalRows) {
      const rentalTotal = parseFloat(r.total_amount || '0');
      let itemPaid = 0;
      if (newRentalPaymentStatus === 'Paid') {
        itemPaid = rentalTotal;
      } else if (newRentalPaymentStatus === 'Partially Paid') {
        itemPaid = invTotal > 0 ? Math.round((invPaid / invTotal) * rentalTotal * 100) / 100 : 0;
      }

      await sql`
        UPDATE admin_rentals SET
          payment_status = ${newRentalPaymentStatus},
          paid_amount = ${itemPaid},
          updated_at = NOW()
        WHERE id = ${r.id}
      `;
    }

    revalidatePath("/admin/rentals");
  } catch (err) {
    console.warn("Failed to sync rental payment status for invoice:", invoiceId, err);
  }
}

export async function getClientInvoicesForRentals(clientId?: string | null, clientEmail?: string | null) {
  await requireAdminSession();
  try {
    let rows: any[] = [];
    if (clientId || clientEmail) {
      rows = await sql`
        SELECT invoice_id, project_name, total, total_due, payment_status, date, due_date
        FROM invoices
        WHERE (
          (${clientEmail || ''} != '' AND LOWER(user_email) = LOWER(${clientEmail || ''}))
          OR (${clientId || ''} != '' AND user_email IN (SELECT email FROM admin_clients WHERE id = ${clientId}))
        )
        ORDER BY created_at DESC
        LIMIT 25
      `;
    }
    return rows.map((r: any) => ({
      invoice_id: r.invoice_id,
      project_name: r.project_name,
      total: parseFloat(r.total || '0'),
      total_due: parseFloat(r.total_due != null ? r.total_due : r.total),
      payment_status: r.payment_status,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      due_date: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : ''
    }));
  } catch (err) {
    console.error("Failed to get client invoices:", err);
    return [];
  }
}

export async function combineRentalInvoices(primaryRentalId: number, rentalIdsToCombine: number[]) {
  await requireAdminSession();
  await ensureRentalsSchema();

  const primaryRows = await sql`SELECT * FROM admin_rentals WHERE id = ${primaryRentalId}`;
  if (primaryRows.length === 0) throw new Error("Primary rental not found");
  const primaryRental = primaryRows[0];

  // 1. Ensure primary rental has an invoice
  if (!primaryRental.invoice_id) {
    const genRes = await generateInvoiceForRental(primaryRentalId);
    if (!genRes?.invoiceId) throw new Error("Failed to initialize invoice for primary rental");
    primaryRental.invoice_id = genRes.invoiceId;
  }

  const primaryInvoiceId = primaryRental.invoice_id;

  // 2. Fetch all other rentals to combine
  const otherRentalIds = rentalIdsToCombine.filter(id => id !== primaryRentalId);
  if (otherRentalIds.length === 0) {
    return { success: true, invoiceId: primaryInvoiceId };
  }

  const secondaryRentals = await sql`
    SELECT * FROM admin_rentals 
    WHERE id = ANY(${otherRentalIds})
  `;

  // Collect distinct old invoice IDs
  const oldInvoiceIds: string[] = [];
  for (const sr of secondaryRentals) {
    if (sr.invoice_id && sr.invoice_id !== primaryInvoiceId && !oldInvoiceIds.includes(sr.invoice_id)) {
      oldInvoiceIds.push(sr.invoice_id);
    }
  }

  // 3. For each secondary rental, ensure line items exist on primaryInvoiceId
  for (const sr of secondaryRentals) {
    const secInvId = sr.invoice_id;

    if (secInvId && secInvId !== primaryInvoiceId) {
      const existingItems = await sql`
        SELECT * FROM invoice_items WHERE invoice_id = ${secInvId}
      `;

      if (existingItems.length > 0) {
        await sql`
          UPDATE invoice_items 
          SET invoice_id = ${primaryInvoiceId}
          WHERE invoice_id = ${secInvId}
        `;
      } else {
        const days = sr.rental_days || 1;
        const qty = sr.quantity || 1;
        const rate = parseFloat(sr.daily_rate || '0') * days;
        const total = parseFloat(sr.total_amount || '0');
        const desc = `Rental of ${sr.item_name} (${days} ${days === 1 ? 'day' : 'days'} @ LKR ${sr.daily_rate}/day)`;
        await sql`
          INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
          VALUES (${primaryInvoiceId}, ${desc}, ${qty}, ${rate}, ${total})
        `;
      }
    } else if (!secInvId) {
      const days = sr.rental_days || 1;
      const qty = sr.quantity || 1;
      const rate = parseFloat(sr.daily_rate || '0') * days;
      const total = parseFloat(sr.total_amount || '0');
      const desc = `Rental of ${sr.item_name} (${days} ${days === 1 ? 'day' : 'days'} @ LKR ${sr.daily_rate}/day)`;
      await sql`
        INSERT INTO invoice_items (invoice_id, description, quantity, price, total)
        VALUES (${primaryInvoiceId}, ${desc}, ${qty}, ${rate}, ${total})
      `;
    }

    await sql`
      UPDATE admin_rentals 
      SET invoice_id = ${primaryInvoiceId}, updated_at = NOW()
      WHERE id = ${sr.id}
    `;
  }

  // 4. Move any income payments and payment slips from old invoices to primaryInvoiceId
  for (const oldInvId of oldInvoiceIds) {
    try {
      await sql`
        UPDATE admin_incomes 
        SET invoice_id = ${primaryInvoiceId}
        WHERE invoice_id = ${oldInvId}
      `;
    } catch {}

    try {
      await sql`
        UPDATE invoice_payment_slips 
        SET invoice_id = ${primaryInvoiceId}
        WHERE invoice_id = ${oldInvId}
      `;
    } catch {}

    try {
      await sql`DELETE FROM invoices WHERE invoice_id = ${oldInvId}`;
    } catch {}
  }

  // 5. Recalculate primary invoice totals and dues
  const itemSumRows = await sql`
    SELECT COALESCE(SUM(total), 0) as new_subtotal 
    FROM invoice_items 
    WHERE invoice_id = ${primaryInvoiceId}
  `;
  const newTotal = parseFloat(itemSumRows[0]?.new_subtotal || '0');

  const incomeSumRows = await sql`
    SELECT COALESCE(SUM(amount), 0) as total_income 
    FROM admin_incomes 
    WHERE invoice_id = ${primaryInvoiceId}
  `;
  const totalIncomePaid = parseFloat(incomeSumRows[0]?.total_income || '0');

  const primaryInvRows = await sql`
    SELECT advance, total, project_name FROM invoices WHERE invoice_id = ${primaryInvoiceId}
  `;
  const primaryAdvance = primaryInvRows.length > 0 ? parseFloat(primaryInvRows[0].advance || '0') : 0;
  const effectivePaid = Math.max(primaryAdvance, totalIncomePaid);
  const newDue = Math.max(0, newTotal - effectivePaid);
  const newStatus = newDue < 0.01 ? 'fully paid' : (effectivePaid > 0 ? 'partially paid' : 'unpaid');

  const allCombinedRentals = await sql`
    SELECT item_name FROM admin_rentals WHERE invoice_id = ${primaryInvoiceId}
  `;
  const combinedName = `Equipment Rental (${allCombinedRentals.length} items): ${allCombinedRentals.map(r => r.item_name).join(', ')}`;

  await sql`
    UPDATE invoices 
    SET project_name = ${combinedName},
        subtotal = ${newTotal},
        total = ${newTotal},
        advance = ${effectivePaid},
        total_due = ${newDue},
        payment_status = ${newStatus}
    WHERE invoice_id = ${primaryInvoiceId}
  `;

  // 6. Sync payment status across all combined rentals
  await syncRentalPaymentStatusForInvoice(primaryInvoiceId);

  await logSystemAction(
    `Combined ${secondaryRentals.length + 1} rentals into single invoice ${primaryInvoiceId}`
  );

  revalidatePath("/admin/rentals");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/income");

  return { success: true, invoiceId: primaryInvoiceId };
}

"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-guard";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { putBlob } from "@/lib/storage";

let _inventorySchemaPromise: Promise<void> | null = null;
async function ensureInventorySchema(): Promise<void> {
  if (_inventorySchemaPromise) return _inventorySchemaPromise;

  _inventorySchemaPromise = (async () => {
    try {
      await sql`
        ALTER TABLE admin_inventory 
          ADD COLUMN IF NOT EXISTS purchase_invoice_url TEXT,
          ADD COLUMN IF NOT EXISTS warranty_letter_url TEXT,
          ADD COLUMN IF NOT EXISTS expense_id INTEGER,
          ADD COLUMN IF NOT EXISTS is_to_buy BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS product_link TEXT,
          ADD COLUMN IF NOT EXISTS estimated_price NUMERIC(12, 2),
          ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS available_for_rent BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS rental_price_per_day NUMERIC(12, 2) DEFAULT 0;
      `;
    } catch (e) {
      console.warn("Could not ensure admin_inventory schema:", e);
    }
  })();

  return _inventorySchemaPromise;
}

export async function getInventoryItems() {
  await requireAdminSession();
  await ensureInventorySchema();

  const items = await sql`
    SELECT i.*, 
           e.description as expense_desc, 
           e.amount as expense_amount, 
           e.receipt_url as expense_receipt_url,
           e.category as expense_category
    FROM admin_inventory i
    LEFT JOIN admin_expenses e ON i.expense_id = e.id
    ORDER BY COALESCE(i.is_to_buy, false) DESC, COALESCE(i.order_index, 0) ASC, i.created_at DESC
  `;
  return items;
}

export async function getInventoryItem(id: string) {
  await requireAdminSession();

  const items = await sql`
    SELECT * FROM admin_inventory
    WHERE id = ${id}
  `;
  return items[0];
}

export async function getExpensesForLinking() {
  await requireAdminSession();

  const rows = await sql`
    SELECT id, description, amount, date, receipt_url, category
    FROM admin_expenses
    ORDER BY date DESC
    LIMIT 200
  `;
  return rows.map((r: any) => ({
    id: r.id,
    description: r.description,
    amount: parseFloat(r.amount || 0),
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    receipt_url: r.receipt_url || null,
    category: r.category || ''
  }));
}

export async function createToBuyItem(data: {
  item_name: string;
  product_link?: string;
  estimated_price?: number | null;
}) {
  await requireAdminSession();
  await ensureInventorySchema();

  const minOrder = await sql`SELECT MIN(order_index) as min_idx FROM admin_inventory WHERE is_to_buy = true`;
  const nextOrder = (minOrder[0]?.min_idx !== null && minOrder[0]?.min_idx !== undefined) ? Number(minOrder[0].min_idx) - 1 : 0;

  const result = await sql`
    INSERT INTO admin_inventory (
      item_name, category, status, is_to_buy, product_link, estimated_price, purchase_price, quantity, order_index
    ) VALUES (
      ${data.item_name},
      ${'To Buy'},
      ${'To Buy'},
      true,
      ${data.product_link || null},
      ${data.estimated_price || null},
      ${data.estimated_price || null},
      1,
      ${nextOrder}
    )
    RETURNING id
  `;
  await logSystemAction(`Created to-buy inventory item: "${data.item_name}"`);
  return result[0];
}

export async function reorderToBuyItems(itemIds: (string | number)[]) {
  await requireAdminSession();
  await ensureInventorySchema();

  try {
    for (let i = 0; i < itemIds.length; i++) {
      await sql`
        UPDATE admin_inventory 
        SET order_index = ${i} 
        WHERE id = ${itemIds[i]} AND is_to_buy = true
      `;
    }
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (err) {
    console.error("Failed to reorder to-buy items", err);
    throw new Error("Failed to reorder items");
  }
}

export async function createInventoryItem(data: any) {
  await requireAdminSession();
  await ensureInventorySchema();

  const result = await sql`
    INSERT INTO admin_inventory (
      item_name, category, serial_number, quantity, status, purchase_date, purchase_price, notes, warranty_letter_url, expense_id, is_to_buy, product_link, estimated_price, purchase_invoice_url, available_for_rent, rental_price_per_day
    ) VALUES (
      ${data.item_name}, ${data.category}, ${data.serial_number || null}, ${data.quantity || 1}, 
      ${data.status || 'Available'}, ${data.purchase_date || null}, ${data.purchase_price || null}, ${data.notes || null},
      ${data.warranty_letter_url || null}, ${data.expense_id || null},
      ${data.is_to_buy !== undefined ? Boolean(data.is_to_buy) : false},
      ${data.product_link || null},
      ${data.estimated_price || null},
      ${data.purchase_invoice_url || null},
      ${data.available_for_rent !== undefined ? Boolean(data.available_for_rent) : false},
      ${data.rental_price_per_day !== undefined && data.rental_price_per_day !== null && data.rental_price_per_day !== '' ? parseFloat(data.rental_price_per_day) : 0}
    )
    RETURNING id
  `;
  await logSystemAction(`Created inventory item: "${data.item_name}"`);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/rentals");
  return result[0];
}

export async function updateInventoryItem(id: string, data: any) {
  await requireAdminSession();
  await ensureInventorySchema();

  await sql`
    UPDATE admin_inventory SET
      item_name = ${data.item_name},
      category = ${data.category},
      serial_number = ${data.serial_number || null},
      quantity = ${data.quantity || 1},
      status = ${data.status || 'Available'},
      purchase_date = ${data.purchase_date || null},
      purchase_price = ${data.purchase_price || null},
      notes = ${data.notes || null},
      warranty_letter_url = ${data.warranty_letter_url || null},
      expense_id = ${data.expense_id || null},
      is_to_buy = ${data.is_to_buy !== undefined ? Boolean(data.is_to_buy) : false},
      product_link = ${data.product_link || null},
      estimated_price = ${data.estimated_price !== undefined ? data.estimated_price : null},
      purchase_invoice_url = ${data.purchase_invoice_url || null},
      available_for_rent = ${data.available_for_rent !== undefined ? Boolean(data.available_for_rent) : false},
      rental_price_per_day = ${data.rental_price_per_day !== undefined && data.rental_price_per_day !== null && data.rental_price_per_day !== '' ? parseFloat(data.rental_price_per_day) : 0},
      updated_at = NOW()
    WHERE id = ${id}
  `;
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/rentals");
  await logSystemAction(`Updated inventory item: "${data.item_name}" (ID: ${id})`);
}

export async function deleteInventoryItem(id: string, itemName: string) {
  await requireAdminSession();

  await sql`DELETE FROM admin_inventory WHERE id = ${id}`;
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/rentals");
  await logSystemAction(`Deleted inventory item: "${itemName}" (ID: ${id})`);
}

export async function toggleRentalAvailability(id: string, availableForRent: boolean, rentalPricePerDay?: number) {
  await requireAdminSession();
  await ensureInventorySchema();

  await sql`
    UPDATE admin_inventory SET
      available_for_rent = ${availableForRent},
      rental_price_per_day = COALESCE(${rentalPricePerDay !== undefined ? rentalPricePerDay : null}, rental_price_per_day),
      updated_at = NOW()
    WHERE id = ${id}
  `;
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/rentals");
  await logSystemAction(`Toggled rental availability for item ID ${id}: ${availableForRent ? 'Enabled' : 'Disabled'}`);
  return { success: true };
}

export async function uploadInventoryDocument(formData: FormData): Promise<string> {
  await requireAdminSession();

  const file = formData.get('file') as File;
  if (!file) throw new Error("No file uploaded");
  const filename = `admin/inventory/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const blob = await putBlob(filename, file, { access: 'public' });
  return blob.url;
}

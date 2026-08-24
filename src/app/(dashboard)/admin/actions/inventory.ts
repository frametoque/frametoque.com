"use server";

import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";

export async function getInventoryItems() {
  const items = await sql`
    SELECT * FROM admin_inventory
    ORDER BY created_at DESC
  `;
  return items;
}

export async function getInventoryItem(id: string) {
  const items = await sql`
    SELECT * FROM admin_inventory
    WHERE id = ${id}
  `;
  return items[0];
}

export async function createInventoryItem(data: any) {
  const result = await sql`
    INSERT INTO admin_inventory (
      item_name, category, serial_number, quantity, status, purchase_date, purchase_price, notes
    ) VALUES (
      ${data.item_name}, ${data.category}, ${data.serial_number || null}, ${data.quantity || 1}, 
      ${data.status || 'Available'}, ${data.purchase_date || null}, ${data.purchase_price || null}, ${data.notes || null}
    )
    RETURNING id
  `;
  await logSystemAction(`Created inventory item: "${data.item_name}"`);
  return result[0];
}

export async function updateInventoryItem(id: string, data: any) {
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
      updated_at = NOW()
    WHERE id = ${id}
  `;
  await logSystemAction(`Updated inventory item: "${data.item_name}" (ID: ${id})`);
}

export async function deleteInventoryItem(id: string, itemName: string) {
  await sql`DELETE FROM admin_inventory WHERE id = ${id}`;
  await logSystemAction(`Deleted inventory item: "${itemName}" (ID: ${id})`);
}

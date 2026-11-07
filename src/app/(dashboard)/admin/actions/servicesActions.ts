"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth-guard";

import sql from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import { putBlob } from "@/lib/storage";
import { TABLE_MAP } from "@/lib/services";

/**
 * Fetch all services for a specific category
 */
export async function getServicesByCategory(categorySlug: string) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  // sql is used as the standard query format in this codebase
  const rows = await sql.unsafe(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
  return rows;
}

/**
 * Create a new service under a specific category
 */
export async function createService(categorySlug: string, data: any) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  // Shift existing elements up by 1 to make space for the new one at index 1
  await sql.unsafe(`UPDATE ${table} SET sort_order = sort_order + 1`);

  await sql.unsafe(
    `INSERT INTO ${table} (service_id, title, description, overview, hero_image, features, packages, process, technologies, created_at, updated_at, sort_order, monthly_price, yearly_price, demo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 1, $10, $11, $12)`,
    [
      data.service_id,
      data.title,
      data.description,
      data.overview,
      data.hero_image,
      JSON.stringify(data.features),
      JSON.stringify(data.packages),
      JSON.stringify(data.process),
      JSON.stringify(data.technologies),
      data.monthly_price || null,
      data.yearly_price || null,
      data.demo_url || null
    ]
  );
}

/**
 * Update an existing service in a specific category
 */
export async function updateService(categorySlug: string, id: number, data: any) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  await sql.unsafe(
    `UPDATE ${table}
     SET service_id = $1, title = $2, description = $3, overview = $4, hero_image = $5,
         features = $6, packages = $7, process = $8, technologies = $9, updated_at = NOW(),
         monthly_price = $10, yearly_price = $11, demo_url = $12
     WHERE id = $13`,
    [
      data.service_id,
      data.title,
      data.description,
      data.overview,
      data.hero_image,
      JSON.stringify(data.features),
      JSON.stringify(data.packages),
      JSON.stringify(data.process),
      JSON.stringify(data.technologies),
      data.monthly_price || null,
      data.yearly_price || null,
      data.demo_url || null,
      id
    ]
  );
}

/**
 * Delete a service from a specific category
 */
export async function deleteService(categorySlug: string, id: number) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  await sql.unsafe(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Swap sort_order between two adjacent services (for reordering)
 */
export async function reorderServices(
  categorySlug: string,
  idA: number,
  idB: number
) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  const res = await sql.unsafe(
    `SELECT id, sort_order FROM ${table} WHERE id = ANY($1)`,
    [[idA, idB]]
  );
  if (res.length < 2) throw new Error("Could not find both services to reorder");

  const rowA = res.find((r: any) => r.id === idA);
  const rowB = res.find((r: any) => r.id === idB);

  await sql.unsafe(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [rowB.sort_order, idA]);
  await sql.unsafe(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [rowA.sort_order, idB]);
}

/**
 * Batch-assign sort_order 1,2,3... based on the provided id order for services.
 * Used when saving a drag-and-drop reorder session.
 */
export async function reorderServicesBatch(
  categorySlug: string,
  orderedIds: number[]
) {
  await requireAdminSession();

  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  for (let i = 0; i < orderedIds.length; i++) {
    await sql.unsafe(
      `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
      [i + 1, orderedIds[i]]
    );
  }
}

/**
 * Upload a service cover image
 */
export async function uploadServiceCover(formData: FormData): Promise<string> {
  await requireAdminSession();

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const filename = `uploads/services/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const blob = await putBlob(filename, file, {
    access: "public",
  });

  return blob.url;
}

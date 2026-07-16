"use server";

import sql from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import { TABLE_MAP } from "@/lib/services";

/**
 * Fetch all services for a specific category
 */
export async function getServicesByCategory(categorySlug: string) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  // sql.query is used as the standard query format in this codebase
  const rows = await sql.query(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`);
  return rows;
}

/**
 * Create a new service under a specific category
 */
export async function createService(categorySlug: string, data: any) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  // Shift existing elements up by 1 to make space for the new one at index 1
  await sql.query(`UPDATE ${table} SET sort_order = sort_order + 1`);

  await sql.query(
    `INSERT INTO ${table} (service_id, title, description, overview, hero_image, features, packages, process, technologies, created_at, updated_at, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 1)`,
    [
      data.service_id,
      data.title,
      data.description,
      data.overview,
      data.hero_image,
      JSON.stringify(data.features),
      JSON.stringify(data.packages),
      JSON.stringify(data.process),
      JSON.stringify(data.technologies)
    ]
  );
}

/**
 * Update an existing service in a specific category
 */
export async function updateService(categorySlug: string, id: number, data: any) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  await sql.query(
    `UPDATE ${table}
     SET service_id = $1, title = $2, description = $3, overview = $4, hero_image = $5,
         features = $6, packages = $7, process = $8, technologies = $9, updated_at = NOW()
     WHERE id = $10`,
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
      id
    ]
  );
}

/**
 * Delete a service from a specific category
 */
export async function deleteService(categorySlug: string, id: number) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Swap sort_order between two adjacent services (for reordering)
 */
export async function reorderServices(
  categorySlug: string,
  idA: number,
  idB: number
) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  const res = await sql.query(
    `SELECT id, sort_order FROM ${table} WHERE id = ANY($1)`,
    [[idA, idB]]
  );
  if (res.length < 2) throw new Error("Could not find both services to reorder");

  const rowA = res.find((r: any) => r.id === idA);
  const rowB = res.find((r: any) => r.id === idB);

  await sql.query(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [rowB.sort_order, idA]);
  await sql.query(`UPDATE ${table} SET sort_order = $1 WHERE id = $2`, [rowA.sort_order, idB]);
}

/**
 * Batch-assign sort_order 1,2,3... based on the provided id order for services.
 * Used when saving a drag-and-drop reorder session.
 */
export async function reorderServicesBatch(
  categorySlug: string,
  orderedIds: number[]
) {
  const table = TABLE_MAP[categorySlug];
  if (!table) {
    throw new Error(`Invalid category: ${categorySlug}`);
  }

  for (let i = 0; i < orderedIds.length; i++) {
    await sql.query(
      `UPDATE ${table} SET sort_order = $1 WHERE id = $2`,
      [i + 1, orderedIds[i]]
    );
  }
}

/**
 * Upload a service cover image
 */
export async function uploadServiceCover(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "services");

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/services/${filename}`;
}

"use server";

import sql from "@/lib/db";
import { requireAdminSession } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

export interface CareerItem {
  id: number;
  title: string;
  department: string;
  employment_type: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  apply_email: string;
  apply_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

async function ensureTable() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS careers (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'Digital',
      employment_type TEXT NOT NULL DEFAULT 'Full-time',
      location TEXT NOT NULL DEFAULT 'Remote / Hybrid',
      description TEXT NOT NULL DEFAULT '',
      requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
      responsibilities TEXT[] DEFAULT ARRAY[]::TEXT[],
      apply_email TEXT DEFAULT 'careers@frametoque.com',
      apply_url TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Fetch all careers for Admin dashboard
 */
export async function getCareersAdmin(): Promise<CareerItem[]> {
  await requireAdminSession();
  await ensureTable();

  const rows = await sql.unsafe(`
    SELECT * FROM careers 
    ORDER BY sort_order ASC, id DESC
  `);

  return rows as unknown as CareerItem[];
}

/**
 * Public getter for active careers on public careers page
 */
export async function getPublicCareers(): Promise<CareerItem[]> {
  try {
    await ensureTable();
    const rows = await sql.unsafe(`
      SELECT * FROM careers 
      WHERE is_active = true 
      ORDER BY sort_order ASC, id DESC
    `);
    return rows as unknown as CareerItem[];
  } catch (err) {
    console.error("Failed to fetch public careers:", err);
    return [];
  }
}

/**
 * Create a new career opening
 */
export async function createCareer(data: {
  title: string;
  department: string;
  employment_type?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  apply_email?: string;
  apply_url?: string;
  is_active?: boolean;
}) {
  await requireAdminSession();
  await ensureTable();

  // Shift sort order
  await sql.unsafe(`UPDATE careers SET sort_order = sort_order + 1`);

  await sql.unsafe(
    `INSERT INTO careers (
      title, department, employment_type, location, description, 
      requirements, responsibilities, apply_email, apply_url, is_active, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)`,
    [
      data.title,
      data.department || "Digital",
      data.employment_type || "Full-time",
      data.location || "Remote / Hybrid",
      data.description || "",
      data.requirements || [],
      data.responsibilities || [],
      data.apply_email || "careers@frametoque.com",
      data.apply_url || "",
      data.is_active !== undefined ? data.is_active : true,
    ]
  );

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}

/**
 * Update an existing career
 */
export async function updateCareer(
  id: number,
  data: {
    title: string;
    department: string;
    employment_type?: string;
    location?: string;
    description?: string;
    requirements?: string[];
    responsibilities?: string[];
    apply_email?: string;
    apply_url?: string;
    is_active?: boolean;
    sort_order?: number;
  }
) {
  await requireAdminSession();
  await ensureTable();

  await sql.unsafe(
    `UPDATE careers 
     SET title = $1, department = $2, employment_type = $3, location = $4,
         description = $5, requirements = $6, responsibilities = $7,
         apply_email = $8, apply_url = $9, is_active = $10, sort_order = $11
     WHERE id = $12`,
    [
      data.title,
      data.department || "Digital",
      data.employment_type || "Full-time",
      data.location || "Remote / Hybrid",
      data.description || "",
      data.requirements || [],
      data.responsibilities || [],
      data.apply_email || "careers@frametoque.com",
      data.apply_url || "",
      data.is_active !== undefined ? data.is_active : true,
      data.sort_order || 1,
      id,
    ]
  );

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}

/**
 * Toggle active status
 */
export async function toggleCareerStatus(id: number, is_active: boolean) {
  await requireAdminSession();
  await ensureTable();

  await sql.unsafe(`UPDATE careers SET is_active = $1 WHERE id = $2`, [is_active, id]);

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}

/**
 * Delete a career
 */
export async function deleteCareer(id: number) {
  await requireAdminSession();
  await ensureTable();

  await sql.unsafe(`DELETE FROM careers WHERE id = $1`, [id]);

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}

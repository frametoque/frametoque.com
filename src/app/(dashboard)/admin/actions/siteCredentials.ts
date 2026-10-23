"use server";

import sql from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface SiteCredential {
  id: number;
  site_name: string;
  domain_name?: string | null;
  client_email?: string | null;
  category: string;
  login_url?: string | null;
  username?: string | null;
  password?: string; // Decrypted on read
  server_ip?: string | null;
  server_port?: string | null;
  server_user?: string | null;
  server_pass?: string | null; // Decrypted on read
  notes?: string | null; // Decrypted on read
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// AES-256-GCM Encryption Helpers
// ---------------------------------------------------------------------------
function getEncryptionKey(): Buffer {
  const secret =
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY ||
    process.env.DATABASE_URL ||
    "fallback-frametoque-secure-vault-key-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptText(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptText(cipherText: string): string {
  if (!cipherText) return "";
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return cipherText; // Fallback if plain
    const [ivHex, tagHex, dataHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("Failed to decrypt field:", err);
    return "[Decryption Error]";
  }
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------
export async function getSiteCredentials(): Promise<SiteCredential[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const rows = await sql`
      SELECT * FROM admin_site_credentials
      ORDER BY site_name ASC, created_at DESC
    `;

    return rows.map((r: any) => ({
      id: r.id,
      site_name: r.site_name,
      domain_name: r.domain_name,
      client_email: r.client_email,
      category: r.category || "WordPress",
      login_url: r.login_url,
      username: r.username,
      password: decryptText(r.password_encrypted || ""),
      server_ip: r.server_ip,
      server_port: r.server_port,
      server_user: r.server_user,
      server_pass: r.server_pass_encrypted ? decryptText(r.server_pass_encrypted) : null,
      notes: r.notes_encrypted ? decryptText(r.notes_encrypted) : null,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : "",
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : "",
    }));
  } catch (err: any) {
    console.error("Error fetching site credentials:", err);
    throw new Error(err.message || "Failed to load credentials");
  }
}

export async function addSiteCredential(data: {
  site_name: string;
  domain_name?: string | null;
  client_email?: string | null;
  category?: string;
  login_url?: string | null;
  username?: string | null;
  password: string;
  server_ip?: string | null;
  server_port?: string | null;
  server_user?: string | null;
  server_pass?: string | null;
  notes?: string | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!data.site_name?.trim()) {
    return { success: false, error: "Website/Project name is required" };
  }
  if (!data.password?.trim()) {
    return { success: false, error: "Password is required" };
  }

  try {
    const encryptedPass = encryptText(data.password.trim());
    const encryptedServerPass = data.server_pass ? encryptText(data.server_pass.trim()) : null;
    const encryptedNotes = data.notes ? encryptText(data.notes.trim()) : null;

    const rows = await sql`
      INSERT INTO admin_site_credentials (
        site_name,
        domain_name,
        client_email,
        category,
        login_url,
        username,
        password_encrypted,
        server_ip,
        server_port,
        server_user,
        server_pass_encrypted,
        notes_encrypted,
        created_at,
        updated_at
      ) VALUES (
        ${data.site_name.trim()},
        ${data.domain_name?.trim() || null},
        ${data.client_email?.trim() || null},
        ${data.category || 'WordPress'},
        ${data.login_url?.trim() || null},
        ${data.username?.trim() || null},
        ${encryptedPass},
        ${data.server_ip?.trim() || null},
        ${data.server_port?.trim() || null},
        ${data.server_user?.trim() || null},
        ${encryptedServerPass},
        ${encryptedNotes},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    revalidatePath("/admin/web-services");
    return { success: true, id: rows[0].id };
  } catch (err: any) {
    console.error("Failed to add site credential:", err);
    return { success: false, error: err.message || "Failed to save credential" };
  }
}

export async function updateSiteCredential(
  id: number,
  data: {
    site_name: string;
    domain_name?: string | null;
    client_email?: string | null;
    category?: string;
    login_url?: string | null;
    username?: string | null;
    password?: string | null;
    server_ip?: string | null;
    server_port?: string | null;
    server_user?: string | null;
    server_pass?: string | null;
    notes?: string | null;
  }
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    // If password provided, encrypt it; otherwise keep existing
    if (data.password && data.password.trim()) {
      const encryptedPass = encryptText(data.password.trim());
      await sql`
        UPDATE admin_site_credentials
        SET password_encrypted = ${encryptedPass}
        WHERE id = ${id}
      `;
    }

    if (data.server_pass !== undefined) {
      const encryptedServerPass = data.server_pass ? encryptText(data.server_pass.trim()) : null;
      await sql`
        UPDATE admin_site_credentials
        SET server_pass_encrypted = ${encryptedServerPass}
        WHERE id = ${id}
      `;
    }

    if (data.notes !== undefined) {
      const encryptedNotes = data.notes ? encryptText(data.notes.trim()) : null;
      await sql`
        UPDATE admin_site_credentials
        SET notes_encrypted = ${encryptedNotes}
        WHERE id = ${id}
      `;
    }

    await sql`
      UPDATE admin_site_credentials
      SET
        site_name = ${data.site_name.trim()},
        domain_name = ${data.domain_name?.trim() || null},
        client_email = ${data.client_email?.trim() || null},
        category = ${data.category || 'WordPress'},
        login_url = ${data.login_url?.trim() || null},
        username = ${data.username?.trim() || null},
        server_ip = ${data.server_ip?.trim() || null},
        server_port = ${data.server_port?.trim() || null},
        server_user = ${data.server_user?.trim() || null},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    revalidatePath("/admin/web-services");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update site credential:", err);
    return { success: false, error: err.message || "Failed to update credential" };
  }
}

export async function deleteSiteCredential(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    await sql`DELETE FROM admin_site_credentials WHERE id = ${id}`;
    revalidatePath("/admin/web-services");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete site credential:", err);
    return { success: false, error: err.message || "Failed to delete credential" };
  }
}

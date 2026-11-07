"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession, requireUserSession } from "@/lib/auth-guard";

import sql from "@/lib/db";
import { PREDEFINED_REPRESENTATIVES } from "@/lib/representatives";
import { encryptField, decryptField } from "@/lib/crypto-vault";

export type AgreementData = {
  id?: number;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  client_company?: string | null;
  client_address?: string | null;
  agreement_type: string;
  title: string;
  agreement_date: string;
  start_date: string;
  delivery_date: string;
  deadline: string;
  total_fee: number;
  deposit: number;
  ui_payment: number;
  final_payment: number;
  payment_methods: string;
  revision_rounds: number;
  hosting_preference: string;
  representative_name: string;
  representative_signature?: string | null;
  status: string;
  client_sig_name?: string | null;
  client_sig_date?: string | null;
  client_sig_image?: string | null;
  created_at?: string;
  updated_at?: string;
};


function formatDateOnly(d: any): string {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getAgreements(): Promise<AgreementData[]> {
  await requireAdminSession();

  try {
    const rows = await sql`
      SELECT * FROM admin_agreements
      ORDER BY COALESCE(agreement_date, created_at::date) DESC, created_at DESC
    `;
    return rows.map(r => ({
      ...r,
      total_fee: parseFloat(r.total_fee || 0),
      deposit: parseFloat(r.deposit || 0),
      ui_payment: parseFloat(r.ui_payment || 0),
      final_payment: parseFloat(r.final_payment || 0),
      revision_rounds: parseInt(r.revision_rounds || 0),
      agreement_date: formatDateOnly(r.agreement_date),
      start_date: formatDateOnly(r.start_date),
      delivery_date: formatDateOnly(r.delivery_date),
      deadline: formatDateOnly(r.deadline),
      client_sig_date: r.client_sig_date ? formatDateOnly(r.client_sig_date) : null,
    } as AgreementData));
  } catch (error) {
    console.error("Failed to get agreements:", error);
    throw new Error("Failed to retrieve agreements.");
  }
}

export async function getAgreementsByClient(email: string): Promise<AgreementData[]> {
  await requireUserSession(email);

  try {
    const rows = await sql`
      SELECT * FROM admin_agreements
      WHERE LOWER(client_email) = LOWER(${email})
      ORDER BY COALESCE(agreement_date, created_at::date) DESC, created_at DESC
    `;
    return rows.map(r => ({
      ...r,
      total_fee: parseFloat(r.total_fee || 0),
      deposit: parseFloat(r.deposit || 0),
      ui_payment: parseFloat(r.ui_payment || 0),
      final_payment: parseFloat(r.final_payment || 0),
      revision_rounds: parseInt(r.revision_rounds || 0),
      agreement_date: formatDateOnly(r.agreement_date),
      start_date: formatDateOnly(r.start_date),
      delivery_date: formatDateOnly(r.delivery_date),
      deadline: formatDateOnly(r.deadline),
      client_sig_date: r.client_sig_date ? formatDateOnly(r.client_sig_date) : null,
    } as AgreementData));
  } catch (error) {
    console.error("Failed to get client agreements:", error);
    throw new Error("Failed to retrieve client agreements.");
  }
}

export async function getAgreementById(id: number): Promise<AgreementData | null> {
  const session = await requireUserSession();

  try {
    const rows = await sql`
      SELECT * FROM admin_agreements
      WHERE id = ${id}
    `;
    if (rows.length === 0) return null;
    
    const r = rows[0];
    if (!session.isAdmin) {
      const agrEmail = (r.client_email || '').toLowerCase().trim();
      const sessEmail = (session.email || '').toLowerCase().trim();
      if (!sessEmail || (agrEmail && agrEmail !== sessEmail)) {
        throw new Error("Unauthorized: You do not have permission to view this agreement");
      }
    }
    const decryptedSig = (r.client_sig_image_encrypted ? decryptField(r.client_sig_image_encrypted, `agreement:sig:${r.id}`) : null) || r.client_sig_image;
    return {
      ...r,
      client_sig_image: decryptedSig,
      total_fee: parseFloat(r.total_fee || 0),
      deposit: parseFloat(r.deposit || 0),
      ui_payment: parseFloat(r.ui_payment || 0),
      final_payment: parseFloat(r.final_payment || 0),
      revision_rounds: parseInt(r.revision_rounds || 0),
      agreement_date: formatDateOnly(r.agreement_date),
      start_date: formatDateOnly(r.start_date),
      delivery_date: formatDateOnly(r.delivery_date),
      deadline: formatDateOnly(r.deadline),
      client_sig_date: r.client_sig_date ? formatDateOnly(r.client_sig_date) : null,
    } as AgreementData;
  } catch (error) {
    console.error("Failed to get agreement by ID:", error);
    throw new Error("Failed to retrieve agreement.");
  }
}

export async function createAgreement(data: any) {
  await requireAdminSession();

  try {
    // Check client existence
    let existingClient: any[] = [];
    if (data.client_email) {
      existingClient = await sql`SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${data.client_email})`;
    }
    
    if (existingClient.length === 0 && (data.client_email || data.client_phone)) {
      const clientId = 'C-' + Date.now();
      await sql`
        INSERT INTO admin_clients (id, full_name, company, email, phone, address, active)
        VALUES (
          ${clientId},
          ${data.client_name},
          ${data.client_company || null},
          ${data.client_email || null},
          ${data.client_phone || null},
          ${data.client_address || null},
          true
        )
      `;
    }

    const result = await sql`
      INSERT INTO admin_agreements (
        client_name, client_email, client_phone, client_company, client_address,
        agreement_type, title, agreement_date, start_date, delivery_date, deadline,
        total_fee, deposit, ui_payment, final_payment, payment_methods,
        revision_rounds, hosting_preference, representative_name, representative_signature, status
      ) VALUES (
        ${data.client_name},
        ${data.client_email || null},
        ${data.client_phone || null},
        ${data.client_company || null},
        ${data.client_address || null},
        ${data.agreement_type},
        ${data.title},
        ${data.agreement_date},
        ${data.start_date},
        ${data.delivery_date},
        ${data.deadline},
        ${parseFloat(data.total_fee) || 0},
        ${parseFloat(data.deposit) || 0},
        ${parseFloat(data.ui_payment) || 0},
        ${parseFloat(data.final_payment) || 0},
        ${data.payment_methods || 'Bank Transfer'},
        ${parseInt(data.revision_rounds) || 3},
        ${data.hosting_preference || 'Option A — Free Hosting'},
        ${data.representative_name},
        ${data.representative_signature || null},
        'pending'
      ) RETURNING id
    `;
    revalidatePath("/admin", "layout");
    return result[0]?.id;
  } catch (error) {
    console.error("Failed to create agreement:", error);
    throw new Error("Failed to create agreement.");
  }
}

export async function updateAgreement(id: number, data: any) {
  await requireAdminSession();

  try {
    await sql`
      UPDATE admin_agreements SET
        client_name = ${data.client_name},
        client_email = ${data.client_email || null},
        client_phone = ${data.client_phone || null},
        client_company = ${data.client_company || null},
        client_address = ${data.client_address || null},
        agreement_type = ${data.agreement_type},
        title = ${data.title},
        agreement_date = ${data.agreement_date},
        start_date = ${data.start_date},
        delivery_date = ${data.delivery_date},
        deadline = ${data.deadline},
        total_fee = ${parseFloat(data.total_fee) || 0},
        deposit = ${parseFloat(data.deposit) || 0},
        ui_payment = ${parseFloat(data.ui_payment) || 0},
        final_payment = ${parseFloat(data.final_payment) || 0},
        payment_methods = ${data.payment_methods || 'Bank Transfer'},
        revision_rounds = ${parseInt(data.revision_rounds) || 3},
        hosting_preference = ${data.hosting_preference || 'Option A — Free Hosting'},
        representative_name = ${data.representative_name},
        representative_signature = ${data.representative_signature || null},
        status = ${data.status || 'pending'}
      WHERE id = ${id}
    `;
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to update agreement:", error);
    throw new Error("Failed to update agreement.");
  }
}

export async function signAgreement(
  id: number,
  clientSigName: string,
  clientSigDate: string,
  clientSigImage: string
) {
  const session = await requireUserSession();

  try {
    const existing = await sql`SELECT client_email FROM admin_agreements WHERE id = ${id}`;
    if (existing.length === 0) throw new Error("Agreement not found");
    if (!session.isAdmin) {
      const agrEmail = (existing[0].client_email || '').toLowerCase().trim();
      const sessEmail = (session.email || '').toLowerCase().trim();
      if (!sessEmail || (agrEmail && agrEmail !== sessEmail)) {
        throw new Error("Unauthorized: You do not have permission to sign this agreement");
      }
    }
    const encSig = clientSigImage ? encryptField(clientSigImage, `agreement:sig:${id}`) : null;
    try {
      await sql`
        UPDATE admin_agreements SET
          client_sig_name = ${clientSigName},
          client_sig_date = ${clientSigDate},
          client_sig_image = ${clientSigImage},
          client_sig_image_encrypted = ${encSig},
          status = 'signed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } catch {
      await sql`
        UPDATE admin_agreements SET
          client_sig_name = ${clientSigName},
          client_sig_date = ${clientSigDate},
          client_sig_image = ${clientSigImage},
          status = 'signed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    }
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to sign agreement:", error);
    throw new Error("Failed to sign agreement.");
  }
}

export async function deleteAgreement(id: number) {
  await requireAdminSession();

  try {
    await sql`
      DELETE FROM admin_agreements
      WHERE id = ${id}
    `;
    revalidatePath("/admin", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete agreement:", error);
    throw new Error("Failed to delete agreement.");
  }
}

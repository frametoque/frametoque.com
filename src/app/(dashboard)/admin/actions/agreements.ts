"use server";

import sql from "@/lib/db";
import { PREDEFINED_REPRESENTATIVES } from "@/lib/representatives";

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


export async function getAgreements(): Promise<AgreementData[]> {
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
      agreement_date: r.agreement_date ? new Date(r.agreement_date).toISOString().split('T')[0] : '',
      start_date: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
      delivery_date: r.delivery_date ? new Date(r.delivery_date).toISOString().split('T')[0] : '',
      deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
      client_sig_date: r.client_sig_date ? new Date(r.client_sig_date).toISOString().split('T')[0] : null,
    } as AgreementData));
  } catch (error) {
    console.error("Failed to get agreements:", error);
    throw new Error("Failed to retrieve agreements.");
  }
}

export async function getAgreementsByClient(email: string): Promise<AgreementData[]> {
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
      agreement_date: r.agreement_date ? new Date(r.agreement_date).toISOString().split('T')[0] : '',
      start_date: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
      delivery_date: r.delivery_date ? new Date(r.delivery_date).toISOString().split('T')[0] : '',
      deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
      client_sig_date: r.client_sig_date ? new Date(r.client_sig_date).toISOString().split('T')[0] : null,
    } as AgreementData));
  } catch (error) {
    console.error("Failed to get client agreements:", error);
    throw new Error("Failed to retrieve client agreements.");
  }
}

export async function getAgreementById(id: number): Promise<AgreementData | null> {
  try {
    const rows = await sql`
      SELECT * FROM admin_agreements
      WHERE id = ${id}
    `;
    if (rows.length === 0) return null;
    
    const r = rows[0];
    return {
      ...r,
      total_fee: parseFloat(r.total_fee || 0),
      deposit: parseFloat(r.deposit || 0),
      ui_payment: parseFloat(r.ui_payment || 0),
      final_payment: parseFloat(r.final_payment || 0),
      revision_rounds: parseInt(r.revision_rounds || 0),
      agreement_date: r.agreement_date ? new Date(r.agreement_date).toISOString().split('T')[0] : '',
      start_date: r.start_date ? new Date(r.start_date).toISOString().split('T')[0] : '',
      delivery_date: r.delivery_date ? new Date(r.delivery_date).toISOString().split('T')[0] : '',
      deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
      client_sig_date: r.client_sig_date ? new Date(r.client_sig_date).toISOString().split('T')[0] : null,
    } as AgreementData;
  } catch (error) {
    console.error("Failed to get agreement by ID:", error);
    throw new Error("Failed to retrieve agreement.");
  }
}

export async function createAgreement(data: any) {
  try {
    // Check client existence
    const existingClient = await sql`
      SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${data.client_email})
    `;
    
    if (existingClient.length === 0 && data.client_email) {
      const clientId = 'C-' + Date.now();
      await sql`
        INSERT INTO admin_clients (id, name, company, email, phone, address, active)
        VALUES (
          ${clientId},
          ${data.client_name},
          ${data.client_company || null},
          ${data.client_email},
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
        ${data.client_email},
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
    return result[0]?.id;
  } catch (error) {
    console.error("Failed to create agreement:", error);
    throw new Error("Failed to create agreement.");
  }
}

export async function updateAgreement(id: number, data: any) {
  try {
    await sql`
      UPDATE admin_agreements SET
        client_name = ${data.client_name},
        client_email = ${data.client_email},
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
  try {
    await sql`
      UPDATE admin_agreements SET
        client_sig_name = ${clientSigName},
        client_sig_date = ${clientSigDate},
        client_sig_image = ${clientSigImage},
        status = 'signed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error("Failed to sign agreement:", error);
    throw new Error("Failed to sign agreement.");
  }
}

export async function deleteAgreement(id: number) {
  try {
    await sql`
      DELETE FROM admin_agreements
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error("Failed to delete agreement:", error);
    throw new Error("Failed to delete agreement.");
  }
}

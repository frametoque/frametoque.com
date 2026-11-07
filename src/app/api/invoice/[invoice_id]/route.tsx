import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";
import { getSessionUser } from "@/lib/auth-guard";
import { verifyAndSyncCardPayment } from "@/app/(dashboard)/admin/actions/payments";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request, { params }) {
  const { invoice_id } = await params;

  try {
    const session = await getSessionUser();
    
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    let userEmails: string[] = session.email ? [session.email.toLowerCase().trim()] : [];
    if (!session.isAdmin) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(session.userId);
        const emails = user.emailAddresses?.map((e: any) => e.emailAddress.toLowerCase().trim()) || [];
        userEmails = Array.from(new Set([...userEmails, ...emails]));
      } catch (e) {
        // ignore
      }
    }

    if (!session.isAdmin && userEmails.length === 0) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const result = session.isAdmin
      ? await sql`
          SELECT
            i.invoice_id,
            i.user_email,
            i.project_name,
            i.date,
            i.due_date,
            i.currency,
            i.subtotal,
            i.discount,
            i.total,
            i.advance,
            i.total_due,
            i.work_status,
            i.payment_status,
            i.created_at,
            i.tax_rate,
            i.bank_account_id,
            ba.name as bank_account_name,
            ba.account_number as bank_account_number,
            ba.bank_name as bank_account_bank,
            ba.branch as bank_account_branch,
            COALESCE(ac.full_name, i.user_email) as client_name,
            ac.address as billing_address
          FROM public.invoices i
          LEFT JOIN public.admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
          LEFT JOIN public.admin_accounts ba ON COALESCE(i.bank_account_id, (SELECT id FROM public.admin_accounts WHERE type = 'Bank Account' LIMIT 1)) = ba.id
          WHERE i.invoice_id = ${invoice_id}
        `
      : userEmails.length > 1
      ? await sql`
          SELECT
            i.invoice_id,
            i.user_email,
            i.project_name,
            i.date,
            i.due_date,
            i.currency,
            i.subtotal,
            i.discount,
            i.total,
            i.advance,
            i.total_due,
            i.work_status,
            i.payment_status,
            i.created_at,
            i.tax_rate,
            i.bank_account_id,
            ba.name as bank_account_name,
            ba.account_number as bank_account_number,
            ba.bank_name as bank_account_bank,
            ba.branch as bank_account_branch,
            COALESCE(ac.full_name, i.user_email) as client_name,
            ac.address as billing_address
          FROM public.invoices i
          LEFT JOIN public.admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
          LEFT JOIN public.admin_accounts ba ON COALESCE(i.bank_account_id, (SELECT id FROM public.admin_accounts WHERE type = 'Bank Account' LIMIT 1)) = ba.id
          WHERE i.invoice_id = ${invoice_id} AND LOWER(i.user_email) IN ${sql(userEmails)}
        `
      : await sql`
          SELECT
            i.invoice_id,
            i.user_email,
            i.project_name,
            i.date,
            i.due_date,
            i.currency,
            i.subtotal,
            i.discount,
            i.total,
            i.advance,
            i.total_due,
            i.work_status,
            i.payment_status,
            i.created_at,
            i.tax_rate,
            i.bank_account_id,
            ba.name as bank_account_name,
            ba.account_number as bank_account_number,
            ba.bank_name as bank_account_bank,
            ba.branch as bank_account_branch,
            COALESCE(ac.full_name, i.user_email) as client_name,
            ac.address as billing_address
          FROM public.invoices i
          LEFT JOIN public.admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
          LEFT JOIN public.admin_accounts ba ON COALESCE(i.bank_account_id, (SELECT id FROM public.admin_accounts WHERE type = 'Bank Account' LIMIT 1)) = ba.id
          WHERE i.invoice_id = ${invoice_id} AND LOWER(i.user_email) = ${userEmails[0]}
        `;

    if (result.length === 0) {
      const invoiceExists = await sql`
        SELECT user_email FROM public.invoices WHERE invoice_id = ${invoice_id}
      `;
      
      if (invoiceExists.length > 0) {
        return NextResponse.json(
          { error: "Unauthorized - This invoice does not belong to your account" },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: `Invoice #${invoice_id} not found` },
          { status: 404 }
        );
      }
    }

    const invoice = result[0] as any;
    
    // Fetch line items
    const itemsResult = await sql`
      SELECT description, price, total, quantity 
      FROM public.invoice_items 
      WHERE invoice_id = ${invoice_id}
      ORDER BY id ASC
    `;
    invoice.items = itemsResult;

    // Fetch payments history
    const paymentsResult = await sql`
      SELECT id, date, amount, payment_method, description, receipt_url 
      FROM public.admin_incomes 
      WHERE invoice_id = ${invoice_id}
      ORDER BY date DESC
    `;
    invoice.payments = paymentsResult.map((p: any) => ({
      id: p.id,
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' }),
      amount: parseFloat(p.amount),
      method: p.payment_method,
      description: p.description,
      receipt_url: p.receipt_url
    }));

    const subtotalVal = parseFloat(invoice.subtotal || 0);
    const discountVal = parseFloat(invoice.discount || 0);
    const advanceVal  = parseFloat(invoice.advance || 0);
    const taxRateVal  = parseFloat(invoice.tax_rate || 0);
    const taxAmountVal = subtotalVal * (taxRateVal / 100);
    const totalVal    = parseFloat(invoice.total || (subtotalVal + taxAmountVal - discountVal));

    const nonAdvancePayments = (invoice.payments || [])
      .filter((p: any) => !String(p.description || '').toLowerCase().startsWith('advance'))
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

    const calculatedTotalDue = Math.max(0, totalVal - advanceVal - nonAdvancePayments);
    invoice.total_due = calculatedTotalDue;
    invoice.payments_total = nonAdvancePayments;

    if (invoice.payment_status !== "paid" && invoice.payment_status !== "fully paid") {
      try {
        const syncResult = await verifyAndSyncCardPayment({ invoiceId: String(invoice_id) });
        if (syncResult && syncResult.status === "succeeded") {
          const refreshed = await sql`
            SELECT payment_status, total_due FROM public.invoices WHERE invoice_id = ${invoice_id}
          `;
          if (refreshed.length > 0) {
            invoice.payment_status = refreshed[0].payment_status;
            invoice.total_due = parseFloat(refreshed[0].total_due || 0);
          }
        }
      } catch (syncErr) {
        // ignore
      }
    }

    return NextResponse.json(invoice, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}
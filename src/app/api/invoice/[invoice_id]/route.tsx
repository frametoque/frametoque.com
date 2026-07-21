import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET(request, { params }) {
  const { invoice_id } = await params;

  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;
  
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT
        i.invoice_id,
        i.user_email,
        i.project_name,
        i.date,
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
        ba.number as bank_account_number,
        ba.bank as bank_account_bank,
        ba.branch as bank_account_branch,
        COALESCE(ac.full_name, i.user_email) as client_name,
        ac.address as billing_address
      FROM public.invoices i
      LEFT JOIN public.admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
      LEFT JOIN public.bank_accs ba ON i.bank_account_id = ba.id
      WHERE i.invoice_id = ${invoice_id} AND LOWER(i.user_email) = LOWER(${userEmail})
    `;

    if (result.length === 0) {
      const invoiceExists = await sql`
        SELECT user_email FROM public.invoices WHERE invoice_id = ${invoice_id}
      `;
      
      if (invoiceExists.length > 0) {
        return NextResponse.json(
          { error: "Unauthorized - This invoice does not belong to you" },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: "Invoice not found" },
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
      SELECT date, amount, payment_method, description 
      FROM public.admin_incomes 
      WHERE invoice_id = ${invoice_id}
      ORDER BY date DESC
    `;
    invoice.payments = paymentsResult.map((p: any) => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: parseFloat(p.amount),
      method: p.payment_method,
      description: p.description
    }));

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}
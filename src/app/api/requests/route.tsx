import { NextResponse } from 'next/server';
import sql from "@/lib/db";
import { requireUserSession, AuthError } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_email = searchParams.get('user_email');
    
    let session;
    try {
      session = await requireUserSession(user_email);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const effectiveEmail = (!session.isAdmin && session.email) ? session.email : user_email;

    if (!effectiveEmail) {
      return NextResponse.json(
        { error: 'user_email is required' },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT 
        invoice_id,
        user_email,
        project_name,
        date,
        due_date,
        subtotal,
        discount,
        advance,
        tax_rate,
        total,
        total_due,
        work_status,
        payment_status,
        currency,
        category,
        created_at
      FROM public.invoices
      WHERE LOWER(user_email) = LOWER(${effectiveEmail}) 
      ORDER BY created_at DESC
    `;
    
    const nonAdvancePaymentsRows = await sql`
      SELECT invoice_id, SUM(amount) as paid_sum
      FROM public.admin_incomes
      WHERE invoice_id IS NOT NULL AND LOWER(description) NOT LIKE 'advance:%' AND LOWER(description) NOT LIKE 'advance payment%'
      GROUP BY invoice_id
    `;
    const paymentsMap: Record<string, number> = {};
    nonAdvancePaymentsRows.forEach((p: any) => {
      paymentsMap[p.invoice_id] = parseFloat(p.paid_sum || '0');
    });

    const formattedRequests = rows.map((row: any) => {
      const subtotal = parseFloat(row.subtotal || 0);
      const discount = parseFloat(row.discount || 0);
      const advance = parseFloat(row.advance || 0);
      const taxRate = parseFloat(row.tax_rate || 0);
      const taxAmount = subtotal * (taxRate / 100);
      const finalTotal = parseFloat(row.total != null ? row.total : (subtotal + taxAmount - discount));
      const nonAdvanceVal = paymentsMap[row.invoice_id] || 0;
      const calculatedTotalDue = Math.max(0, finalTotal - advance - nonAdvanceVal);

      return {
        id: row.invoice_id,
        title: row.project_name || 'Untitled Project',
        request_id: row.invoice_id,
        invoice_number: row.invoice_id,
        submitted_at: row.date ? new Date(row.date).toISOString() : (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()),
        status: row.work_status || 'pending',
        progress: row.work_status === 'completed' ? 100 : row.work_status === 'in progress' ? 50 : 10,
        price: finalTotal,
        type: row.category,
        description: null,
        user_email: row.user_email,
        client_id: null,
        created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        payment_status: calculatedTotalDue < 0.01 ? 'fully paid' : (row.payment_status || 'unpaid'),
        total_due: calculatedTotalDue,
        total: finalTotal,
        currency: row.currency || 'LKR',
      };
    });

    return NextResponse.json(formattedRequests);
    
  } catch (error: any) {
    console.error('Database error:', error);
    
    if (error.message.includes('relation "public.projects" does not exist')) {
      return NextResponse.json([]);
    }
    
    if (error.message.includes('column "user_email" does not exist')) {
      console.log('user_email column does not exist in projects table');
      return NextResponse.json(
        { error: 'Database schema missing user_email column. Please run migrations.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch requests',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
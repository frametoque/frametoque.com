import { NextResponse } from 'next/server';
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  console.log('API Route: /api/requests called');
  
  try {
    const { searchParams } = new URL(request.url);
    const user_email = searchParams.get('user_email');
    
    console.log('Query param user_email:', user_email);
    
    if (!user_email) {
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
        subtotal,
        discount,
        total,
        total_due,
        work_status,
        payment_status,
        currency,
        category,
        created_at
      FROM public.invoices
      WHERE LOWER(user_email) = LOWER(${user_email}) 
      ORDER BY created_at DESC
    `;
    
    console.log(`Found ${rows.length} invoices for user_email: ${user_email}`);
    
    const formattedRequests = rows.map(row => {
      const subtotal = parseFloat((row as any).subtotal || 0);
      const discount = parseFloat((row as any).discount || 0);
      const finalTotal = subtotal - discount;

      return {
        id: (row as any).invoice_id,
        title: (row as any).project_name || 'Untitled Project',
        request_id: (row as any).invoice_id,
        invoice_number: (row as any).invoice_id,
        submitted_at: (row as any).date ? new Date((row as any).date).toISOString() : ((row as any).created_at ? new Date((row as any).created_at).toISOString() : new Date().toISOString()),
        status: (row as any).work_status || 'pending',
        progress: (row as any).work_status === 'completed' ? 100 : (row as any).work_status === 'in progress' ? 50 : 10,
        price: finalTotal,
        type: (row as any).category,
        description: null,
        user_email: (row as any).user_email,
        client_id: null,
        created_at: (row as any).created_at ? new Date((row as any).created_at).toISOString() : new Date().toISOString(),
        payment_status: (row as any).payment_status || 'unpaid',
        total_due: (row as any).total_due ? parseFloat((row as any).total_due) : 0,
        total: finalTotal,
        currency: (row as any).currency || 'LKR',
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
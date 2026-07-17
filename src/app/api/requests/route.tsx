import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET(request) {
  console.log('API Route: /api/requests called');
  
  let client;
  
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

    client = await pool.connect();
    
    const result = await client.query(`
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
      WHERE LOWER(user_email) = LOWER($1) 
      ORDER BY created_at DESC
    `, [user_email]);
    
    console.log(`Found ${result.rows.length} invoices for user_email: ${user_email}`);
    
    const formattedRequests = result.rows.map(row => {
      const subtotal = parseFloat(row.subtotal || 0);
      const discount = parseFloat(row.discount || 0);
      const finalTotal = subtotal - discount;

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
        payment_status: row.payment_status || 'unpaid',
        total_due: row.total_due ? parseFloat(row.total_due) : 0,
        total: finalTotal,
        currency: row.currency || 'LKR',
      };
    });
    
    return NextResponse.json(formattedRequests);
    
  } catch (error) {
    console.error('Database error:', error);
    
    if (error.message.includes('relation "public.projects" does not exist')) {
      console.log('Projects table does not exist, returning empty array');
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
    
  } finally {
    if (client) {
      client.release();
    }
  }
}
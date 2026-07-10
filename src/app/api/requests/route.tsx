import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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
        p.id,
        p.invoice_number,
        p.title,
        p.description,
        p.type,
        p.request_id,
        p.submitted_at,
        p.status,
        p.progress,
        p.price,
        p.user_email,
        p.client_id,
        p.created_at,
        i.payment_status
      FROM public.projects p
      LEFT JOIN public.invoices i ON p.invoice_number = i.invoice_id
      WHERE p.user_email = $1 
      ORDER BY p.created_at DESC
    `, [user_email]);
    
    console.log(`Found ${result.rows.length} projects for user_email: ${user_email}`);
    
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      title: row.title || 'Untitled Project',
      request_id: row.request_id,
      invoice_number: row.invoice_number,
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
      status: row.status || 'pending',
      progress: row.progress || 0,
      price: row.price,
      type: row.type,
      description: row.description,
      user_email: row.user_email,
      client_id: row.client_id,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      payment_status: row.payment_status || 'unpaid',
    }));
    
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
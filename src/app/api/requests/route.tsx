// app/api/requests/route.js
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
        invoice_id,
        project_name,
        date,
        work_status,
        total,
        user_email,
        currency
      FROM invoices 
      WHERE user_email = $1 
      ORDER BY invoice_id DESC
    `, [user_email]);
    
    console.log(`Found ${result.rows.length} requests for user_email: ${user_email}`);
    
    const formattedRequests = result.rows.map(row => ({
      id: row.invoice_id,
      title: row.project_name || 'Untitled Request',
      request_id: row.invoice_id,
      submitted_at: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      status: row.work_status || 'pending',
      total: row.total,
      user_email: row.user_email,
      currency: row.currency,
    }));
    
    return NextResponse.json(formattedRequests);
    
  } catch (error) {
    console.error('Database error:', error);
    
    if (error.message.includes('relation "invoices" does not exist')) {
      console.log('Invoices table does not exist, returning empty array');
      return NextResponse.json([]);
    }
    
    if (error.message.includes('column "user_email" does not exist')) {
      console.log('user_email column does not exist in invoices table');
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
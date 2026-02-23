// app/api/requests/route.js
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize database connection
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
        id,
        title,
        request_id,
        submitted_at,
        status,
        progress,
        type,
        price,
        user_email
      FROM projects 
      WHERE user_email = $1 
      ORDER BY submitted_at DESC
    `, [user_email]);
    
    console.log(`Found ${result.rows.length} requests for user_email: ${user_email}`);
    
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      title: row.title || 'Untitled Request',
      request_id: row.request_id || `REQ-${row.id.toString().padStart(3, '0')}`,
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
      status: row.status || 'pending',
      progress: row.progress || 0,
      type: row.type || 'General',
      price: row.price,
      user_email: row.user_email
    }));
    
    return NextResponse.json(formattedRequests);
    
  } catch (error) {
    console.error('Database error:', error);
    
    if (error.message.includes('relation "projects" does not exist')) {
      console.log('Projects table does not exist, returning empty array');
      return NextResponse.json([]);
    }
    
    if (error.message.includes('column "user_email" does not exist')) {
      console.log('user_email column does not exist in projects table');
      // Unlike clerk_id fallback, we should NOT return all projects here
      // since email is the security boundary for manually pre-added projects
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
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
    const clerk_id = searchParams.get('clerk_id');
    
    console.log('Query param clerk_id:', clerk_id);
    
    if (!clerk_id) {
      return NextResponse.json(
        { error: 'clerk_id is required' },
        { status: 400 }
      );
    }

    // Get a client from the pool
    client = await pool.connect();
    
    // Modified query structure - handle potential database schema differences
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
        clerk_id
      FROM projects 
      WHERE clerk_id = $1 
      ORDER BY submitted_at DESC
    `, [clerk_id]);
    
    console.log(`Found ${result.rows.length} requests for clerk_id: ${clerk_id}`);
    
    // Format the response data
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      title: row.title || 'Untitled Request',
      request_id: row.request_id || `REQ-${row.id.toString().padStart(3, '0')}`,
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
      status: row.status || 'pending',
      progress: row.progress || 0,
      type: row.type || 'General',
      price: row.price,
      clerk_id: row.clerk_id
    }));
    
    return NextResponse.json(formattedRequests);
    
  } catch (error) {
    console.error('Database error:', error);
    
    // Check for specific errors
    if (error.message.includes('relation "projects" does not exist')) {
      console.log('Projects table does not exist, returning empty array');
      return NextResponse.json([]);
    }
    
    if (error.message.includes('column "clerk_id" does not exist')) {
      console.log('clerk_id column does not exist, trying alternative query');
      try {
        if (client) {
          // Try to query all projects if clerk_id column doesn't exist
          const result = await client.query(`
            SELECT 
              id,
              title,
              request_id,
              submitted_at,
              status,
              progress,
              type,
              price
            FROM projects 
            ORDER BY submitted_at DESC 
          `);
          
          // Filter or map based on your application logic
          // For now, return limited data
          const limitedData = result.rows.slice(0, 5).map(row => ({
            id: row.id,
            title: row.title || 'Untitled Request',
            request_id: row.request_id || `REQ-${row.id.toString().padStart(3, '0')}`,
            submitted_at: row.submitted_at ? new Date(row.submitted_at).toISOString() : new Date().toISOString(),
            status: row.status || 'pending',
            progress: row.progress || 0,
            type: row.type || 'General',
            price: row.price
          }));
          
          return NextResponse.json(limitedData);
        }
      } catch (secondError) {
        console.error('Second query error:', secondError);
      }
    }
    
    
    // In production, return proper error
    return NextResponse.json(
      { 
        error: 'Failed to fetch requests',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
    
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
}
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clerkId = searchParams.get('userId');

    if (!clerkId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch client profile from admin_clients using clerk_id
    const rows = await sql`
      SELECT
        clerk_id,
        email,
        COALESCE(full_name, name) as full_name,
        phone,
        company,
        website,
        address
      FROM admin_clients
      WHERE clerk_id = ${clerkId}
      LIMIT 1
    `;

    const user = rows?.[0];

    if (!user) {
      return NextResponse.json({
        success: true,
        profile: null
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        phone: user.phone || '',
        company: user.company || '',
        website: user.website || '',
        address: user.address || '',
        fullName: user.full_name || '',
        email: user.email || '',
        clerk_id: user.clerk_id || '',
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch profile'
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUserSession, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let session;
    try {
      session = await requireUserSession();
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
      }
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedClerkId = searchParams.get('userId');
    const requestedEmail = searchParams.get('email');

    // Non-admin callers can only access their own profile
    const clerkId = (session.isAdmin && requestedClerkId) ? requestedClerkId : session.userId;
    const email = (session.isAdmin && requestedEmail) ? requestedEmail : session.email;

    // Fetch client profile from admin_clients using clerk_id or matching email
    let rows = await sql`
      SELECT
        clerk_id,
        email,
        full_name,
        phone,
        company,
        website,
        address
      FROM admin_clients
      WHERE clerk_id = ${clerkId}
      LIMIT 1
    `;

    if (rows.length === 0 && email) {
      rows = await sql`
        SELECT
          clerk_id,
          email,
          full_name,
          phone,
          company,
          website,
          address
        FROM admin_clients
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `;

      if (rows.length > 0) {
        // Auto-link clerk_id to this client record
        await sql`
          UPDATE admin_clients
          SET clerk_id = ${clerkId}, updated_at = NOW()
          WHERE LOWER(email) = LOWER(${email}) AND (clerk_id IS NULL OR clerk_id = '')
        `;
      }
    }

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
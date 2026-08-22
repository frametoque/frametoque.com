import { NextResponse } from 'next/server';
import sql from "@/lib/db";
import { logSystemAction } from "@/lib/logger";
import { publishToPlatform } from "@/app/(dashboard)/admin/actions/social-media";


// Example Cron endpoint to process scheduled posts
// In Vercel, setup vercel.json with:
// "crons": [{ "path": "/api/cron/social-publisher", "schedule": "*/5 * * * *" }]
export async function GET(request: Request) {
  // Validate Vercel cron request (auth header)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch all scheduled posts that are due
    const duePosts = await sql`
      SELECT * FROM social_posts 
      WHERE status = 'scheduled' 
      AND scheduled_time <= NOW()
    `;

    if (duePosts.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No posts due" });
    }

    let processedCount = 0;

    // 2. Process each post
    for (const post of duePosts) {
      try {
        let anySuccess = false;
        
        for (const platform of post.platforms || []) {
           const res = await publishToPlatform(post.id, platform);
           if (!res.success) {
               console.error(`Failed to publish scheduled post ${post.id} to ${platform}:`, res.error);
           } else {
               anySuccess = true;
           }
           
           // Small delay between platform API calls to prevent rate limits
           await new Promise(r => setTimeout(r, 1000));
        }

        const finalStatus = anySuccess ? 'published' : 'failed';

        // Mark as published or failed
        await sql`
          UPDATE social_posts 
          SET status = ${finalStatus}
          WHERE id = ${post.id}
        `;
        
        if (anySuccess) await logSystemAction("publish_social_post");
        processedCount++;
      } catch (err: any) {
        // Mark as failed on hard crash
        await sql`
          UPDATE social_posts 
          SET status = 'failed' 
          WHERE id = ${post.id}
        `;
        console.error(`Fatal error processing scheduled post ${post.id}`, err);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error: any) {
    console.error("Cron failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

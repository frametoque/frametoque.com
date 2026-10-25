import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import sql from "@/lib/db";
import { list } from "@vercel/blob";
import { isR2Configured, getR2Client } from "@/lib/storage";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const isAdmin = user?.publicMetadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Check DB
    let dbStatus = "Disconnected";
    try {
      await sql`SELECT 1`;
      dbStatus = "Connected";
    } catch (e) {
      console.error("DB check failed:", e);
    }

    // 2. Check Vercel Blob
    let blobStatus = "Not Configured";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await list({ limit: 1 });
        blobStatus = "Connected";
      } catch (e) {
        console.error("Vercel Blob verification failed (possibly suspended):", e);
        blobStatus = "Suspended / Error";
      }
    }

    // 3. Check Cloudflare R2
    let r2Status = "Not Configured";
    if (isR2Configured()) {
      try {
        const r2 = getR2Client();
        await r2.send(
          new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME!,
            MaxKeys: 1,
          })
        );
        r2Status = "Connected";
      } catch (e) {
        console.error("Cloudflare R2 verification failed:", e);
        r2Status = "Configuration Error";
      }
    }

    return NextResponse.json({
      success: true,
      dbStatus,
      blobStatus,
      r2Status,
      activeStorage: blobStatus === "Connected" ? "Vercel Blob (Primary)" : (r2Status === "Connected" ? "Cloudflare R2 (Active Backup)" : "None"),
      env: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    console.error("System status API error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch status" }, { status: 500 });
  }
}

import { list } from "@vercel/blob";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, getR2PublicBaseUrl, sanitizeKey, detectContentType, isR2Configured, isVercelBlobConfigured } from "./storage";
import sql from "./db";

export interface MigrationOptions {
  updateDatabaseUrls?: boolean;
  dryRun?: boolean;
  prefix?: string;
  limit?: number;
}

export interface MigrationResult {
  totalFound: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ pathname: string; error: string }>;
  dbUpdatedTables?: Record<string, number>;
}

/**
 * Migrates all files from Vercel Blob into Cloudflare R2.
 * Maintains the exact same folder structure.
 */
export async function migrateVercelBlobToR2(
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  if (!isVercelBlobConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing. Cannot list Vercel Blob files.");
  }
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured. Please fill in R2 keys in .env.local.");
  }

  const { updateDatabaseUrls = false, dryRun = false, prefix, limit } = options;
  const r2Client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const r2BaseUrl = getR2PublicBaseUrl();

  const result: MigrationResult = {
    totalFound: 0,
    migratedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  let cursor: string | undefined = undefined;
  let hasMore = true;
  let processed = 0;

  console.info(`[Migration] Starting Vercel Blob -> Cloudflare R2 migration (dryRun=${dryRun})...`);

  while (hasMore) {
    const listRes = await list({
      cursor,
      prefix,
      limit: limit ? Math.min(limit - processed, 100) : 100,
    });

    const blobs = listRes.blobs;
    result.totalFound += blobs.length;

    for (const blob of blobs) {
      const pathname = sanitizeKey(blob.pathname);
      console.info(`[Migration] Processing (${processed + 1}/${result.totalFound}): ${pathname}`);

      if (dryRun) {
        result.migratedCount++;
        processed++;
        continue;
      }

      try {
        // 1. Download from Vercel Blob
        const downloadUrl = blob.downloadUrl || blob.url;
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          throw new Error(`Failed to download from Vercel: status ${res.status} ${res.statusText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = detectContentType(pathname, res.headers.get("content-type") || undefined);

        // 2. Upload to Cloudflare R2 with identical key
        await r2Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: pathname,
            Body: buffer,
            ContentType: contentType,
          })
        );

        result.migratedCount++;
      } catch (err: any) {
        console.error(`[Migration Error] Failed to migrate ${pathname}:`, err);
        result.failedCount++;
        result.errors.push({ pathname, error: err.message || String(err) });
      }

      processed++;
      if (limit && processed >= limit) {
        hasMore = false;
        break;
      }
    }

    if (listRes.hasMore && (!limit || processed < limit)) {
      cursor = listRes.cursor;
    } else {
      hasMore = false;
    }
  }

  // 3. Optionally update database URLs
  if (updateDatabaseUrls && !dryRun && r2BaseUrl) {
    result.dbUpdatedTables = {};

    try {
      // work_photography_photos
      const photosRes = await sql`
        UPDATE work_photography_photos
        SET src = regexp_replace(src, '^https://[^/]+\\.public\\.blob\\.vercel-storage\\.com', ${r2BaseUrl})
        WHERE src LIKE '%blob.vercel-storage.com%'
      `;
      result.dbUpdatedTables["work_photography_photos"] = photosRes.count;

      // admin_incomes
      const incomesRes = await sql`
        UPDATE admin_incomes
        SET receipt_url = regexp_replace(receipt_url, '^https://[^/]+\\.public\\.blob\\.vercel-storage\\.com', ${r2BaseUrl})
        WHERE receipt_url LIKE '%blob.vercel-storage.com%'
      `;
      result.dbUpdatedTables["admin_incomes"] = incomesRes.count;

      // admin_expenses
      const expensesRes = await sql`
        UPDATE admin_expenses
        SET receipt_url = regexp_replace(receipt_url, '^https://[^/]+\\.public\\.blob\\.vercel-storage\\.com', ${r2BaseUrl})
        WHERE receipt_url LIKE '%blob.vercel-storage.com%'
      `;
      result.dbUpdatedTables["admin_expenses"] = expensesRes.count;

      // invoice_payment_slips
      const slipsRes = await sql`
        UPDATE invoice_payment_slips
        SET slip_url = regexp_replace(slip_url, '^https://[^/]+\\.public\\.blob\\.vercel-storage\\.com', ${r2BaseUrl})
        WHERE slip_url LIKE '%blob.vercel-storage.com%'
      `;
      result.dbUpdatedTables["invoice_payment_slips"] = slipsRes.count;

      // work_graphics
      try {
        const graphicsRes = await sql`
          UPDATE work_graphics
          SET image_path = regexp_replace(image_path, '^https://[^/]+\\.public\\.blob\\.vercel-storage\\.com', ${r2BaseUrl})
          WHERE image_path LIKE '%blob.vercel-storage.com%'
        `;
        result.dbUpdatedTables["work_graphics"] = graphicsRes.count;
      } catch {}

      console.info("[Migration] Database URLs updated:", result.dbUpdatedTables);
    } catch (dbErr: any) {
      console.error("[Migration DB Error] Failed to update some database records:", dbErr);
    }
  }

  return result;
}

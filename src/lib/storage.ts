import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageUploadOptions {
  access?: "public";
  contentType?: string;
  addRandomSuffix?: boolean;
  cacheControlMaxAge?: number;
}

export interface StorageResult {
  url: string;
  downloadUrl?: string;
  pathname: string;
  contentType?: string;
  provider: "vercel-blob" | "r2";
}

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pkpass": "application/vnd.apple.pkpass",
};

/**
 * Detects MIME content-type from file extension or provided hint.
 */
export function detectContentType(pathname: string, explicit?: string): string {
  if (explicit && explicit !== "application/octet-stream") return explicit;
  const match = pathname.match(/\.[a-zA-Z0-9]+$/);
  if (match) {
    const ext = match[0].toLowerCase();
    if (MIME_MAP[ext]) return MIME_MAP[ext];
  }
  return "application/octet-stream";
}

/**
 * Checks if Cloudflare R2 is configured in environment variables.
 */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Checks if Vercel Blob is configured.
 */
export function isVercelBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

let s3ClientInstance: S3Client | null = null;

/**
 * Returns a singleton S3 client configured for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 is not configured. Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY."
    );
  }

  s3ClientInstance = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Gets the base public URL for Cloudflare R2 objects.
 */
export function getR2PublicBaseUrl(): string {
  const customUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (customUrl) {
    return customUrl.replace(/\/+$/, "");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (bucket && accountId) {
    return `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
  }
  return "";
}

/**
 * Normalizes pathname (removes leading slash, preserves folder hierarchy).
 */
export function sanitizeKey(key: string): string {
  return key.replace(/^\/+/, "");
}

/**
 * Extracts storage key from a Vercel Blob URL, R2 URL, or raw pathname.
 */
export function extractStorageKey(urlOrPath: string): string {
  if (!urlOrPath) return "";
  try {
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      const parsed = new URL(urlOrPath);
      return sanitizeKey(decodeURIComponent(parsed.pathname));
    }
  } catch {
    // Not a valid URL, treat as raw path
  }
  return sanitizeKey(urlOrPath);
}

/**
 * Converts any upload body (File, Blob, Buffer, string) to Buffer.
 */
async function toBuffer(body: File | Blob | Buffer | Uint8Array | string): Promise<{ buffer: Buffer; contentType?: string }> {
  if (Buffer.isBuffer(body)) {
    return { buffer: body };
  }
  if (typeof body === "string") {
    return { buffer: Buffer.from(body) };
  }
  if (body instanceof Uint8Array) {
    return { buffer: Buffer.from(body) };
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    const arrayBuffer = await body.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: body.type || undefined,
    };
  }
  throw new Error("Unsupported body type for storage upload");
}

/**
 * Unified put: Tries Vercel Blob first.
 * If Vercel Blob fails (suspended, 403, network, etc.), automatically falls back to Cloudflare R2!
 * Preserves the exact same folder structure.
 */
export async function putBlob(
  pathname: string,
  body: File | Blob | Buffer | Uint8Array | string,
  options?: StorageUploadOptions
): Promise<StorageResult> {
  const cleanKey = sanitizeKey(pathname);
  let vercelError: Error | null = null;

  // 1. Try Vercel Blob first if configured
  if (isVercelBlobConfigured()) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(cleanKey, body as any, {
        access: "public",
        contentType: options?.contentType,
        addRandomSuffix: options?.addRandomSuffix,
        cacheControlMaxAge: options?.cacheControlMaxAge,
      });

      return {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname || cleanKey,
        contentType: blob.contentType,
        provider: "vercel-blob",
      };
    } catch (err: any) {
      vercelError = err;
      console.warn(
        `[Storage Warning] Vercel Blob upload failed for "${cleanKey}": ${err?.message || err}. Attempting Cloudflare R2 fallback...`
      );
    }
  }

  // 2. Fallback to Cloudflare R2
  if (!isR2Configured()) {
    if (vercelError) {
      throw new Error(
        `Vercel Blob failed (${vercelError.message}) and Cloudflare R2 is not configured in .env.local. Please provide R2 credentials.`
      );
    }
    throw new Error("Neither Vercel Blob nor Cloudflare R2 is configured.");
  }

  try {
    const { buffer, contentType: inferredType } = await toBuffer(body);
    const contentType = detectContentType(cleanKey, options?.contentType || inferredType);
    const r2Client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const baseUrl = getR2PublicBaseUrl();
    const r2Url = baseUrl ? `${baseUrl}/${cleanKey}` : cleanKey;

    console.info(`[Storage] Successfully uploaded "${cleanKey}" to Cloudflare R2 (Backup)`);

    return {
      url: r2Url,
      downloadUrl: r2Url,
      pathname: cleanKey,
      contentType,
      provider: "r2",
    };
  } catch (r2Err: any) {
    console.error(`[Storage Error] Cloudflare R2 upload also failed for "${cleanKey}":`, r2Err);
    if (vercelError) {
      throw new Error(
        `Storage failed on both providers. Vercel Blob error: ${vercelError.message}; Cloudflare R2 error: ${r2Err.message}`
      );
    }
    throw r2Err;
  }
}

/**
 * Unified delete: Attempts to delete from Vercel Blob and Cloudflare R2.
 */
export async function deleteBlob(urlOrPath: string): Promise<void> {
  const key = extractStorageKey(urlOrPath);

  // 1. Try Vercel Blob
  if (isVercelBlobConfigured() && (urlOrPath.includes("vercel-storage.com") || !urlOrPath.startsWith("http"))) {
    try {
      const { del } = await import("@vercel/blob");
      await del(urlOrPath);
    } catch (err) {
      console.warn("[Storage Warning] Vercel Blob delete failed:", err);
    }
  }

  // 2. Also try R2 if configured
  if (isR2Configured() && key) {
    try {
      const r2 = getR2Client();
      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
        })
      );
    } catch (err) {
      console.warn("[Storage Warning] Cloudflare R2 delete failed:", err);
    }
  }
}

/**
 * Translates a Vercel Blob URL into the equivalent Cloudflare R2 URL.
 */
export function getEquivalentR2Url(vercelUrl: string): string | null {
  const baseUrl = getR2PublicBaseUrl();
  if (!baseUrl) return null;
  const key = extractStorageKey(vercelUrl);
  if (!key) return null;
  return `${baseUrl}/${key}`;
}

/**
 * Downloads / fetches a file with automatic fallback to Cloudflare R2 if Vercel Blob fails (403, 404, or network error).
 */
export async function fetchWithFallback(urlOrKey: string, init?: RequestInit): Promise<Response> {
  let isVercelUrl = urlOrKey.includes("blob.vercel-storage.com");

  // If it's a URL, attempt fetching it first
  if (urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) {
    try {
      const res = await fetch(urlOrKey, init);
      if (res.ok) {
        return res;
      }
      console.warn(`[Storage] Fetching ${urlOrKey} returned status ${res.status}. Trying fallback...`);
    } catch (err: any) {
      console.warn(`[Storage] Fetch failed for ${urlOrKey}: ${err.message}. Trying fallback...`);
    }
  }

  // Fallback to Cloudflare R2
  const key = extractStorageKey(urlOrKey);
  const r2Base = getR2PublicBaseUrl();

  // Try public R2 URL first if available
  if (r2Base && key) {
    try {
      const r2Url = `${r2Base}/${key}`;
      const res = await fetch(r2Url, init);
      if (res.ok) {
        return res;
      }
    } catch (err) {
      // Continue to S3 GetObject fallback
    }
  }

  // Try direct R2 S3 GetObject if public fetch didn't succeed
  if (isR2Configured() && key) {
    try {
      const r2 = getR2Client();
      const s3Res = await r2.send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
        })
      );

      const stream = s3Res.Body?.transformToWebStream();
      if (stream) {
        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": s3Res.ContentType || "application/octet-stream",
            "Content-Length": s3Res.ContentLength ? String(s3Res.ContentLength) : "",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (err: any) {
      console.error(`[Storage Error] R2 GetObject failed for ${key}:`, err);
    }
  }

  throw new Error(`Failed to retrieve file from either Vercel Blob or Cloudflare R2 for "${urlOrKey}"`);
}

/**
 * Resolves a media URL.
 * If NEXT_PUBLIC_PREFER_R2 is set to "true" or STORAGE_PROVIDER="r2",
 * rewrites Vercel Blob URL to Cloudflare R2 URL.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const preferR2 = process.env.NEXT_PUBLIC_PREFER_R2 === "true" || process.env.STORAGE_PROVIDER === "r2";
  if (preferR2) {
    const r2Url = getEquivalentR2Url(url);
    if (r2Url) return r2Url;
  }
  return url;
}


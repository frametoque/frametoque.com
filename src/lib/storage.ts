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
  provider: "r2";
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

const DANGEROUS_EXTENSIONS = new Set([
  ".html", ".htm", ".exe", ".sh", ".php", ".bat", ".cmd", ".js", ".mjs", ".cgi", ".jar", ".vbs", ".dll",
  ".svg", ".xml", ".xhtml", ".shtml", ".jsp", ".asp", ".aspx"
]);

const ALLOWED_STORAGE_HOST_PATTERNS = [
  /\.public\.blob\.vercel-storage\.com$/,
  /\.r2\.dev$/,
  /\.cloudflarestorage\.com$/,
  /^(.*\.)?frametoque\.com$/,
];

/**
 * Validates whether an external URL is an approved storage host and not an internal/private address.
 */
export function isAllowedStorageUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    // Block loopback, local, internal, and cloud metadata addresses
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "169.254.169.254" ||
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      host.endsWith(".lan")
    ) {
      return false;
    }
    // Block private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [_, a, b] = ipv4Match.map(Number);
      if (
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a === 0
      ) {
        return false;
      }
    }
    return ALLOWED_STORAGE_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}

/**
 * Normalizes pathname, prevents directory traversal, and blocks executable extensions.
 */
export function sanitizeKey(key: string): string {
  if (!key) return "";
  // Strip null bytes and control characters
  let clean = key.replace(/[\0\x00-\x1f\x7f]/g, "").replace(/^\/+/, "");
  // Block directory traversal sequences
  clean = clean.replace(/\.\.+[/\\]/g, "").replace(/\.\.+$/g, "");

  const match = clean.match(/\.[a-zA-Z0-9]+$/);
  if (match) {
    const ext = match[0].toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new Error(`Upload of executable or dangerous file extension (${ext}) is prohibited.`);
    }
  }

  return clean;
}

/**
 * Extracts storage key from a URL or raw pathname.
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
 * Uploads an object directly to Cloudflare R2 preserving exact file structure.
 */
export async function uploadToR2(
  pathname: string,
  body: File | Blob | Buffer | Uint8Array | string,
  options?: StorageUploadOptions
): Promise<StorageResult> {
  const cleanKey = sanitizeKey(pathname);

  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_BUCKET_NAME in environment."
    );
  }

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
      ContentLength: buffer.length,
      CacheControl: options?.cacheControlMaxAge
        ? `public, max-age=${options.cacheControlMaxAge}`
        : "public, max-age=31536000, immutable",
    })
  );

  const baseUrl = getR2PublicBaseUrl();
  const r2Url = baseUrl ? `${baseUrl}/${cleanKey}` : cleanKey;

  return {
    url: r2Url,
    downloadUrl: r2Url,
    pathname: cleanKey,
    contentType,
    provider: "r2",
  };
}

// Alias for compatibility
export const uploadFile = uploadToR2;

/**
 * Deletes an object from Cloudflare R2.
 */
export async function deleteFromR2(urlOrPath: string): Promise<void> {
  const key = extractStorageKey(urlOrPath);
  if (!key) return;

  if (isR2Configured()) {
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

// Alias for compatibility
export const deleteFile = deleteFromR2;

/**
 * Translates any storage URL or path into the Cloudflare R2 URL.
 */
export function getEquivalentR2Url(urlOrPath: string): string | null {
  const baseUrl = getR2PublicBaseUrl();
  if (!baseUrl) return null;
  const key = extractStorageKey(urlOrPath);
  if (!key) return null;
  return `${baseUrl}/${key}`;
}

/**
 * Downloads / fetches a file directly from Cloudflare R2 (or public R2 CDN).
 */
export async function fetchWithFallback(urlOrKey: string, init?: RequestInit): Promise<Response> {
  const key = extractStorageKey(urlOrKey);
  const r2Base = getR2PublicBaseUrl();

  // 1. Try public R2 URL first if available
  if (r2Base && key) {
    try {
      const r2Url = `${r2Base}/${key}`;
      const res = await fetch(r2Url, init);
      if (res.ok) {
        return res;
      }
    } catch {
      // Continue to direct S3 GetObject
    }
  }

  // 2. If it's an allowed external URL, attempt fetch
  if ((urlOrKey.startsWith("http://") || urlOrKey.startsWith("https://")) && isAllowedStorageUrl(urlOrKey)) {
    try {
      const res = await fetch(urlOrKey, init);
      if (res.ok) {
        return res;
      }
    } catch {
      // Continue to direct S3 GetObject
    }
  }

  // 3. Direct R2 S3 GetObject
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
      console.error(`[Storage Error] R2 GetObject failed for "${key}":`, err);
    }
  }

  throw new Error(`Failed to retrieve file from Cloudflare R2 for "${urlOrKey}"`);
}

/**
 * Resolves a media URL to its Cloudflare R2 URL.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const r2Url = getEquivalentR2Url(url);
  return r2Url || url;
}

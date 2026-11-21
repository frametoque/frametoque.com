import { NextRequest, NextResponse } from "next/server";
import { fetchWithFallback, extractStorageKey, detectContentType, isAllowedStorageUrl } from "@/lib/storage";
import { getSessionUser } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const SENSITIVE_PATH_PATTERNS = [
  /receipts?\//i,
  /payment[_-]slips?\//i,
  /agreements?\//i,
  /kyc\//i,
  /id[_-]cards?\//i,
  /utility[_-]bills?\//i,
  /credentials?\//i,
  /passwords?\//i,
];

function isSensitiveMedia(key: string): boolean {
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Universal media route serving from Cloudflare R2 with legacy path support.
 * Can be accessed via:
 * 1. Path format: /api/media/admin/receipts/income/123-file.png
 * 2. Query format: /api/media?url=https://...
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path } = await context.params;
    let target = "";

    const urlParam = req.nextUrl.searchParams.get("url");
    if (urlParam) {
      target = urlParam;
    } else if (path && path.length > 0) {
      target = path.join("/");
    }

    if (!target) {
      return NextResponse.json({ error: "No media path or url provided" }, { status: 400 });
    }

    if ((target.startsWith("http://") || target.startsWith("https://")) && !isAllowedStorageUrl(target)) {
      return NextResponse.json(
        { error: "Access to external or unapproved media URL is prohibited" },
        { status: 403 }
      );
    }

    const key = extractStorageKey(target);
    const isSensitive = isSensitiveMedia(key);

    if (isSensitive) {
      const session = await getSessionUser();
      if (!session || !session.userId) {
        return NextResponse.json({ error: "Unauthorized: Authentication required to access private documents" }, { status: 401 });
      }
    }

    const response = await fetchWithFallback(target);
    const contentType = response.headers.get("Content-Type") || detectContentType(key);

    const cacheHeader = isSensitive
      ? "private, no-cache, no-store, max-age=0, must-revalidate"
      : "public, max-age=31536000, immutable";

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheHeader,
      },
    });
  } catch (error: any) {
    console.error("[Media Route Error]", error);
    return NextResponse.json(
      { error: "Media not found on Cloudflare R2", details: error.message },
      { status: 404 }
    );
  }
}

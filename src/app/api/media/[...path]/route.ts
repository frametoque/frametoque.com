import { NextRequest, NextResponse } from "next/server";
import { fetchWithFallback, extractStorageKey, detectContentType } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Universal media route with automatic fallback from Vercel Blob to Cloudflare R2.
 * Can be accessed via:
 * 1. Path format: /api/media/admin/receipts/income/123-file.png
 * 2. Query format: /api/media?url=https://...blob.vercel-storage.com/...
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

    const response = await fetchWithFallback(target);
    const key = extractStorageKey(target);
    const contentType = response.headers.get("Content-Type") || detectContentType(key);

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("[Media Route Error]", error);
    return NextResponse.json(
      { error: "Media not found on either Vercel Blob or Cloudflare R2", details: error.message },
      { status: 404 }
    );
  }
}

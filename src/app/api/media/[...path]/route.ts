import { NextRequest, NextResponse } from "next/server";
import { fetchWithFallback, extractStorageKey, detectContentType, isAllowedStorageUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

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
      { error: "Media not found on Cloudflare R2", details: error.message },
      { status: 404 }
    );
  }
}

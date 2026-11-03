import { NextRequest, NextResponse } from "next/server";
import { fetchWithFallback, extractStorageKey, detectContentType } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get("url");
    if (!urlParam) {
      return NextResponse.json({ error: "No media url provided" }, { status: 400 });
    }

    const response = await fetchWithFallback(urlParam);
    const key = extractStorageKey(urlParam);
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


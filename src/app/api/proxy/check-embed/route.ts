import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMBED_CACHE = new Map<string, { embeddable: boolean; reason?: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ embeddable: false, reason: "Invalid protocol" });
    }

    // Check cache
    const cached = EMBED_CACHE.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ embeddable: cached.embeddable, reason: cached.reason });
    }

    // Perform fast HEAD check with abort timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FrametoqueBot/1.0)" },
        redirect: "follow",
        signal: controller.signal,
      });
    } catch {
      // If HEAD fails or is rejected, try quick GET with small range
      clearTimeout(timeout);
      const getController = new AbortController();
      const getTimeout = setTimeout(() => getController.abort(), 2500);
      try {
        res = await fetch(url, {
          method: "GET",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FrametoqueBot/1.0)", Range: "bytes=0-1024" },
          signal: getController.signal,
        });
      } finally {
        clearTimeout(getTimeout);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 400) {
      const result = { embeddable: false, reason: `HTTP ${res.status}` };
      EMBED_CACHE.set(url, { ...result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    const xfo = (res.headers.get("x-frame-options") || "").toLowerCase().trim();
    if (xfo === "deny" || xfo === "sameorigin") {
      const result = { embeddable: false, reason: `X-Frame-Options: ${xfo}` };
      EMBED_CACHE.set(url, { ...result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    const csp = (res.headers.get("content-security-policy") || "").toLowerCase();
    if (csp.includes("frame-ancestors") && !csp.includes("frame-ancestors *") && !csp.includes("frame-ancestors https:")) {
      const result = { embeddable: false, reason: "CSP frame-ancestors restricted" };
      EMBED_CACHE.set(url, { ...result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    const result = { embeddable: true };
    EMBED_CACHE.set(url, { ...result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ embeddable: false, reason: err.message || "Network error" });
  }
}

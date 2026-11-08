import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAdminSession } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
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
    return true;
  }

  // Check IPv4 private ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  return false;
}

function getLocalChromePath(): string | undefined {
  const possiblePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const delayMs = parseInt(searchParams.get("delay") || "2000", 10);
  const width = parseInt(searchParams.get("width") || "1920", 10);
  const height = parseInt(searchParams.get("height") || "1080", 10);

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing required 'url' parameter" }, { status: 400 });
  }

  let formattedUrl = targetUrl.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = "https://" + formattedUrl;
  }

  try {
    const parsed = new URL(formattedUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid URL scheme" }, { status: 400 });
    }
    if (isBlockedHost(parsed.hostname)) {
      return NextResponse.json({ error: "Access to private or local network addresses is prohibited" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
  }

  // 1. Preferred portable approach: lightweight external capture adapter
  // Avoids launching 500MB headless browser instances on serverless / shared hosting
  const customServiceUrl = process.env.SCREENSHOT_SERVICE_URL;
  const externalCaptureUrl = customServiceUrl
    ? `${customServiceUrl}?url=${encodeURIComponent(formattedUrl)}&width=${width}&height=${height}`
    : `https://s0.wp.com/mshots/v1/${encodeURIComponent(formattedUrl)}?w=${Math.min(width, 1440)}&h=${Math.min(height, 900)}`;

  try {
    const extRes = await fetch(externalCaptureUrl, {
      headers: {
        "User-Agent": "FrametoqueBot/1.0",
      },
      next: { revalidate: 3600 },
    });
    if (extRes.ok) {
      const imgBuffer = await extRes.arrayBuffer();
      const contentType = extRes.headers.get("content-type") || "image/jpeg";
      if (imgBuffer.byteLength > 1000) {
        return new NextResponse(imgBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      }
    }
  } catch (extErr) {
    console.warn("External screenshot capture fallback triggered:", extErr);
  }

  // 2. Optional local puppeteer fallback if specifically enabled and available
  let browser: any = null;
  try {
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL;

    if (isProduction && process.env.ENABLE_PUPPETEER_SCREENSHOT === "true") {
      const { default: chromium } = await import("@sparticuz/chromium");
      const { default: puppeteerCore } = await import("puppeteer-core");
      const executablePath = await chromium.executablePath();
      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          `--window-size=${width},${height}`,
        ],
        defaultViewport: { width, height },
        executablePath,
        headless: true,
      });
    } else if (!isProduction) {
      const { default: puppeteer } = await import("puppeteer");
      const executablePath = getLocalChromePath();
      const launchOptions: any = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          `--window-size=${width},${height}`,
        ],
        defaultViewport: { width, height },
      };
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      browser = await puppeteer.launch(launchOptions);
    }

    if (browser) {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      );
      await page.goto(formattedUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 3000)));
      }
      const screenshotBuffer = await page.screenshot({ type: "png", fullPage: false });
      await browser.close();
      browser = null;

      return new NextResponse(screenshotBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    return NextResponse.json(
      { error: "Screenshot generation completed via fallback or unavailable on this host" },
      { status: 502 }
    );
  } catch (error: any) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        // ignore
      }
    }
    return NextResponse.json(
      { error: error?.message || "Failed to capture screenshot" },
      { status: 500 }
    );
  }
}

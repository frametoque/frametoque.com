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
  const internalSecret = req.headers.get("x-internal-secret");
  const isInternal = Boolean(
    internalSecret && process.env.CRON_SECRET && internalSecret === process.env.CRON_SECRET
  );

  if (!isInternal) {
    try {
      await requireAdminSession();
    } catch {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const delayMs = parseInt(searchParams.get("delay") || "2000", 10);
  const isMobile = searchParams.get("mobile") === "true";
  const defaultWidth = isMobile ? 390 : 1920;
  const defaultHeight = isMobile ? 844 : 1080;
  const width = parseInt(searchParams.get("width") || String(defaultWidth), 10);
  const height = parseInt(searchParams.get("height") || String(defaultHeight), 10);

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

  // 1. If custom internal screenshot service is configured, use it first
  const customServiceUrl = process.env.SCREENSHOT_SERVICE_URL;
  if (customServiceUrl) {
    try {
      const extRes = await fetch(
        `${customServiceUrl}?url=${encodeURIComponent(formattedUrl)}&width=${width}&height=${height}&delay=${delayMs}`,
        { headers: { "User-Agent": "FrametoqueBot/1.0" } }
      );
      if (extRes.ok) {
        const imgBuffer = await extRes.arrayBuffer();
        if (imgBuffer.byteLength > 1000) {
          return new NextResponse(imgBuffer, {
            headers: {
              "Content-Type": extRes.headers.get("content-type") || "image/png",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          });
        }
      }
    } catch (err) {
      console.warn("Custom screenshot service failed, falling back to Puppeteer/external:", err);
    }
  }

  // 2. High-fidelity capture via Puppeteer (local Chrome on macOS/Linux or Sparticuz on serverless)
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
      const { default: puppeteerCore } = await import("puppeteer-core");
      const executablePath = getLocalChromePath();
      if (executablePath) {
        browser = await puppeteerCore.launch({
          headless: true,
          executablePath,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            `--window-size=${width},${height}`,
          ],
          defaultViewport: { width, height },
        });
      }
    }

    if (browser) {
      const page = await browser.newPage();
      if (isMobile) {
        await page.setUserAgent(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        );
        await page.setViewport({
          width,
          height,
          isMobile: true,
          hasTouch: true,
          deviceScaleFactor: 2,
        });
      } else {
        await page.setUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        );
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
      }
      await page.goto(formattedUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));
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
  } catch (puppeteerErr) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    console.warn("Puppeteer capture failed or unavailable, falling back to clean cloud capture:", puppeteerErr);
  }

  // 3. Clean cloud screenshot providers (NO WordPress / wp.com branding)
  const waitSeconds = Math.min(Math.max(Math.round(delayMs / 1000), 1), 6);
  const externalCaptureUrls = isMobile
    ? [
        `https://api.microlink.io?url=${encodeURIComponent(formattedUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.isMobile=true&viewport.width=390&viewport.height=844&viewport.deviceScaleFactor=2`,
        `https://image.thum.io/get/width/390/crop/844/wait/${waitSeconds}/noanimate/${formattedUrl}`,
      ]
    : [
        `https://image.thum.io/get/width/${Math.min(width, 1440)}/crop/900/wait/${waitSeconds}/noanimate/${formattedUrl}`,
        `https://api.microlink.io?url=${encodeURIComponent(formattedUrl)}&screenshot=true&meta=false&embed=screenshot.url`,
      ];

  for (const captureUrl of externalCaptureUrls) {
    try {
      const extRes = await fetch(captureUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FrametoqueBot/1.0)",
        },
        next: { revalidate: 3600 },
      });
      if (extRes.ok) {
        const imgBuffer = await extRes.arrayBuffer();
        const contentType = extRes.headers.get("content-type") || "image/png";
        if (imgBuffer.byteLength > 2000) {
          return new NextResponse(imgBuffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          });
        }
      }
    } catch (extErr) {
      console.warn(`External capture failed for ${captureUrl}:`, extErr);
    }
  }

  return NextResponse.json(
    { error: "Failed to generate screenshot from available renderers" },
    { status: 502 }
  );
}

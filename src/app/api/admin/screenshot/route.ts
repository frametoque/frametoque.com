import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";
import fs from "fs";
import { requireAdminSession } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for screenshot generation on Next.js/Vercel

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

  let browser = null;

  try {
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL;

    if (isProduction) {
      // Use sparticuz/chromium for serverless environment (Vercel)
      const executablePath = await chromium.executablePath();
      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--window-size=1920,1080",
        ],
        defaultViewport: { width, height },
        executablePath,
        headless: true,
      });
    } else {
      // Local dev environment: try local Chrome/Brave/Edge or bundled puppeteer
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

    const page = await browser.newPage();

    // Set realistic User-Agent & Language headers
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    // Inject stealth masks to bypass Cloudflare & bot checks
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver flag
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Mock window.chrome runtime
      (window as any).chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };

      // Mock navigator plugins & languages
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    // Navigate to target URL
    try {
      await page.goto(formattedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (e: any) {
      if (e.name === "TimeoutError" || e.message.includes("timeout")) {
        console.warn(`Navigation timeout for ${formattedUrl}, attempting screenshot anyway.`);
      } else {
        throw e;
      }
    }

    // Wait for specified delay to allow page rendering to complete
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Capture screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    await browser.close();
    browser = null;

    return new NextResponse(Uint8Array.from(screenshotBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error: any) {
    console.error("Stealth screenshot error:", error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error("Failed closing browser:", closeErr);
      }
    }
    return NextResponse.json(
      { error: error?.message || "Failed to capture screenshot" },
      { status: 500 }
    );
  }
}

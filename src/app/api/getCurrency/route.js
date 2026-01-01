export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request) {
  try {
    let isSriLanka = false; // DEFAULT = USD
    let detectedBy = 'unknown';

    const { searchParams } = new URL(request.url);

    /* -------------------------------
       1️⃣ DEV MODE (manual testing)
    -------------------------------- */
    if (isDev) {
      const testCurrency = searchParams.get('currency');

      if (testCurrency === 'lkr') {
        isSriLanka = true;
      } else {
        isSriLanka = false;
      }

      detectedBy = 'dev-query';
    }

    /* -------------------------------
       2️⃣ PRODUCTION
    -------------------------------- */
    else {
      /* -------- Cloudflare (BEST) -------- */
      const cfCountry = request.headers.get('cf-ipcountry');

      if (cfCountry) {
        isSriLanka = cfCountry === 'LK';
        detectedBy = 'cloudflare';
      }

      /* -------- Vercel / Edge IP -------- */
      else {
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim();

        // Local / private IPs → treat as NON-SL
        if (
          !ip ||
          ip === '127.0.0.1' ||
          ip === '::1' ||
          ip.startsWith('192.168.') ||
          ip.startsWith('10.') ||
          ip.startsWith('172.')
        ) {
          isSriLanka = false;
          detectedBy = 'private-ip';
        } else {
          /* -------- Geo API fallback -------- */
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);

            const res = await fetch(`https://ipapi.co/${ip}/json/`, {
              signal: controller.signal
            });

            clearTimeout(timeout);

            if (res.ok) {
              const data = await res.json();
              isSriLanka = data.country_code === 'LK';
              detectedBy = 'ipapi';
            } else {
              isSriLanka = false;
              detectedBy = 'api-fallback';
            }
          } catch (err) {
            isSriLanka = false;
            detectedBy = 'api-error';
          }
        }
      }
    }

    /* -------------------------------
       RESPONSE
    -------------------------------- */
    return Response.json({
      currency: isSriLanka ? 'LKR' : 'USD',
      showUSD: !isSriLanka,
      country: isSriLanka ? 'LK' : 'NON_LK',
      detectedBy,
      mode: isDev ? 'development' : 'production'
    });

  } catch (error) {
    return Response.json(
      {
        currency: 'USD',
        error: 'Currency detection failed'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

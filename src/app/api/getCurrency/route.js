export const runtime = 'edge'; // Edge = faster + IP headers
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request) {
  try {
    let isSriLanka = false;
    let detectedBy = 'unknown';

    const { searchParams } = new URL(request.url);

    /* -------------------------------
       1️⃣ DEV MODE (manual testing)
       ?currency=lkr or ?currency=usd
    -------------------------------- */
    if (isDev) {
      const testCurrency = searchParams.get('currency');

      if (testCurrency === 'lkr') {
        isSriLanka = true;
      } else if (testCurrency === 'usd') {
        isSriLanka = false;
      } else {
        isSriLanka = false; // default dev = USD
      }

      detectedBy = 'dev-query';
    }

    /* -------------------------------
       2️⃣ CLOUDFLARE (BEST METHOD)
       Header: cf-ipcountry
    -------------------------------- */
    else {
      const cfCountry = request.headers.get('cf-ipcountry');

      if (cfCountry) {
        isSriLanka = cfCountry === 'LK';
        detectedBy = 'cloudflare';
      }

      /* -------------------------------
         3️⃣ VERCEL / EDGE IP DETECTION
      -------------------------------- */
      else {
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim();

        // Local / private IPs
        if (
          !ip ||
          ip === '127.0.0.1' ||
          ip === '::1' ||
          ip.startsWith('192.168.') ||
          ip.startsWith('10.') ||
          ip.startsWith('172.')
        ) {
          isSriLanka = true;
          detectedBy = 'local-ip';
        } else {
          /* -------------------------------
             4️⃣ FALLBACK GEO API
          -------------------------------- */
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
              isSriLanka = true; // safe fallback
              detectedBy = 'api-fallback';
            }
          } catch (err) {
            isSriLanka = true;
            detectedBy = 'api-error';
          }
        }
      }
    }

    /* -------------------------------
       RESPONSE
    -------------------------------- */
    return Response.json({
      showUSD: !isSriLanka,
      currency: isSriLanka ? 'LKR' : 'USD',
      country: isSriLanka ? 'LK' : 'NON_LK',
      mode: isDev ? 'development' : 'production',
      detectedBy
    });

  } catch (error) {
    return Response.json(
      {
        showUSD: false,
        currency: 'LKR',
        error: 'Currency detection failed'
      },
      { status: 500 }
    );
  }
}

/* -------------------------------
   BLOCK OTHER METHODS
-------------------------------- */
export async function POST() {
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

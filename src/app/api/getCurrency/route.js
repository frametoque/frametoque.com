export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    let isSriLanka = false;
    let detectedBy = 'unknown';
    let ipAddress = null;
    let countryCode = null;

    // Cloudflare detection (primary method)
    const cfCountry = request.headers.get('cf-ipcountry');

    if (cfCountry) {
      countryCode = cfCountry;
      isSriLanka = cfCountry === 'LK';
      detectedBy = 'cloudflare';
    } else {

      const forwarded = request.headers.get('x-forwarded-for');
      ipAddress = forwarded ? forwarded.split(',')[0].trim() : null;

      const isLocalhost = ipAddress === '::1' || ipAddress === '127.0.0.1';
      const isPrivateIP = ipAddress && (
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        (ipAddress.startsWith('172.') &&
          parseInt(ipAddress.split('.')[1]) >= 16 &&
          parseInt(ipAddress.split('.')[1]) <= 31)
      );

      if (isLocalhost) {

        isSriLanka = false; // Set to true for LKR, false for USD testing
        countryCode = isSriLanka ? 'LK' : 'US';
        detectedBy = 'localhost';
      } else if (isPrivateIP) {

        isSriLanka = false;
        countryCode = 'NON_LK';
        detectedBy = 'private-ip';
      } else if (ipAddress) {

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Next.js-Currency-Detection/1.0'
            }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            countryCode = data.country_code;
            isSriLanka = countryCode === 'LK';
            detectedBy = 'ipapi';
          } else {

            isSriLanka = false;
            countryCode = 'API_ERROR';
            detectedBy = 'ipapi-failed';
          }
        } catch (error) {
          console.error('IP API error:', error.name, error.message);

          isSriLanka = false;
          countryCode = 'API_ERROR';
          detectedBy = 'ipapi-error';
        }
      } else {
        isSriLanka = false;
        countryCode = 'NO_IP';
        detectedBy = 'no-ip-detected';
      }
    }

    return Response.json({
      showUSD: !isSriLanka,
      currency: isSriLanka ? 'LKR' : 'USD',
      country: countryCode || (isSriLanka ? 'LK' : 'NON_LK'),
      detectedBy: detectedBy,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error in currency detection API:', error);

    return Response.json({
      showUSD: true,
      currency: 'USD',
      country: 'ERROR',
      detectedBy: 'system-error',
      error: 'Failed to detect currency',
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST() {
  return Response.json({
    error: 'Method not allowed',
    message: 'Only GET method is supported'
  }, {
    status: 405,
    headers: {
      'Allow': 'GET'
    }
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
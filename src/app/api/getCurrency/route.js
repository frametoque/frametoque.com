export const dynamic = 'force-dynamic';

const isDevelopment = process.env.NODE_ENV === 'development';

export async function GET(request) {
  try {
    let isSriLanka = false;
    
    if (isDevelopment) {
      // true For LKR in localhost testing
      isSriLanka = false;
      
      const { searchParams } = new URL(request.url);
      const testCurrency = searchParams.get('currency');
      
      if (testCurrency === 'usd') {
        isSriLanka = false;
      } else if (testCurrency === 'lkr') {
        isSriLanka = true;
      }
      
      console.log('Development mode - isSriLanka:', isSriLanka);
    } else {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : request.ip;
      
      if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
      
        isSriLanka = true;
      } else {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            isSriLanka = data.country_code === 'LK';
          } else {
            isSriLanka = true;
          }
        } catch (error) {
          console.error('IP API error:', error);
       
          isSriLanka = true;
        }
      }
    }
    
    return Response.json({ 
      showUSD: !isSriLanka,
      country: isSriLanka ? 'LK' : 'Other',
      mode: isDevelopment ? 'development' : 'production'
    });
    
  } catch (error) {
    console.error('Error in getcurrency API:', error);
    return Response.json({ 
      showUSD: false,
      error: 'Failed to detect currency',
      mode: isDevelopment ? 'development' : 'production'
    });
  }
}

export async function POST(request) {
  return Response.json({ 
    error: 'Method not allowed' 
  }, { status: 405 });
}
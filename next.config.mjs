const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.frametoque.com https://challenges.cloudflare.com https://va.vercel-scripts.com https://*.umami.is;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  media-src 'self' https://*.public.blob.vercel-storage.com https://*.r2.dev https://*.cloudflarestorage.com data: blob:;
  connect-src 'self' https: wss: https://*.clerk.accounts.dev https://clerk.frametoque.com https://api.payments.lk https://api.cloudflare.com https://photon.komoot.io https://open.er-api.com https://api.open-meteo.com;
  frame-src 'self' https://challenges.cloudflare.com https://*.youtube.com https://www.youtube.com;
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    staleTimes: {
      dynamic: 0,
    },
  },
  serverExternalPackages: [
    '@sparticuz/chromium',
    'puppeteer-core',
    'googleapis',
  ],
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@sparticuz/chromium/**',
      'node_modules/puppeteer-core/**',
      'node_modules/googleapis/**',
      'scripts/**',
      'docs/**',
      '.git/**',
    ],
  },
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      // Direct 1-hop redirects for legacy work/projects
      {
        source: '/work',
        destination: '/productions/work/photography',
        permanent: true,
      },
      {
        source: "/projects",
        destination: "/productions/work/photography",
        permanent: true,
      },
      {
        source: "/projects/photography",
        destination: "/productions/work/photography",
        permanent: true,
      },
      {
        source: "/projects/videography",
        destination: "/productions/work/videography",
        permanent: true,
      },
      {
        source: "/projects/video-editing",
        destination: "/productions/work/video-editing",
        permanent: true,
      },
      {
        source: "/projects/web-dev",
        destination: "/digital/work/web-dev",
        permanent: true,
      },
      {
        source: "/projects/graphic-design",
        destination: "/digital/work/graphic-design",
        permanent: true,
      },
      // Direct 1-hop redirects for legacy services
      {
        source: "/services",
        destination: "/digital",
        permanent: true,
      },
      {
        source: "/services/web-dev",
        destination: "/digital/services/web-dev",
        permanent: true,
      },
      {
        source: "/services/web-dev/:slug",
        destination: "/digital/services/web-dev/:slug",
        permanent: true,
      },
      {
        source: "/services/graphic-design",
        destination: "/digital/services/graphic-design",
        permanent: true,
      },
      {
        source: "/services/graphic-design/:slug",
        destination: "/digital/services/graphic-design/:slug",
        permanent: true,
      },
      {
        source: "/services/photo-video",
        destination: "/productions/services/photo-video",
        permanent: true,
      },
      {
        source: "/services/photo-video/:slug",
        destination: "/productions/services/photo-video/:slug",
        permanent: true,
      },
      {
        source: "/services/video-editing",
        destination: "/productions/services/video-editing",
        permanent: true,
      },
      {
        source: "/services/video-editing/:slug",
        destination: "/productions/services/video-editing/:slug",
        permanent: true,
      },
      {
        source: "/services/saas-products",
        destination: "/digital#saas",
        permanent: true,
      },
      {
        source: "/services/saas-products/:slug",
        destination: "/digital#saas",
        permanent: true,
      },
      {
        source: "/services/domain/:path*",
        destination: "/digital",
        permanent: true,
      },
      // Framebooks redirects to Digital SaaS section
      {
        source: "/framebooks",
        destination: "/digital#saas",
        permanent: true,
      },
      {
        source: "/framebooks/:path*",
        destination: "/digital#saas",
        permanent: true,
      },
      {
        source: "/accrue",
        destination: "/digital#saas",
        permanent: true,
      },
      {
        source: "/accrue/:path*",
        destination: "/digital#saas",
        permanent: true,
      },
      // Duplicate home route
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      // Rentals legacy redirects
      {
        source: "/rent",
        destination: "/rentals",
        permanent: true,
      },
      {
        source: "/rent/cart",
        destination: "/rentals/cart",
        permanent: true,
      },
      {
        source: "/rentals/kit",
        destination: "/rentals/cart",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/sitemap',
      },
    ];
  },

  images: {
    qualities: [100, 75],
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.youtube.com',
        port: '',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
        port: '',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.frametoque.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
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
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/work',
        destination: '/projects',
        permanent: true,
      },
      {
        source: "/projects",
        destination: "/projects/photography",
        permanent: true,
      },
      {
        source: "/services",
        destination: "/services/photo-video",
        permanent: true,
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
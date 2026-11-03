/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
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
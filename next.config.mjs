/** @type {import('next').NextConfig} */

import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  exclude: [/^\/admin/],
});

const nextConfig = {
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
    ],
  },
};

export default nextConfig;

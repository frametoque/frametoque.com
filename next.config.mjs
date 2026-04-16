/** @type {import('next').NextConfig} */
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
        permanent: false,
      },
    ];
    
  },
  
  images: {
    qualities: [100, 75],
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

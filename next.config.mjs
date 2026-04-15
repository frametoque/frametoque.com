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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/vi/**', 
      },
    ],
  },
};

export default nextConfig;

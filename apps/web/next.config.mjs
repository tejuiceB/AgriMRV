/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Help prevent hydration errors
  // See: https://nextjs.org/docs/messages/react-hydration-error
  compiler: {
    styledComponents: true,
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

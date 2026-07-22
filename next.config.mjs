/** @type {import('next').NextConfig} */
const isStaticExport = process.env.CAPACITOR_BUILD === '1'

const nextConfig = {
  // Capacitor (Android) needs `out/`. Vercel must use the normal Next.js build.
  ...(isStaticExport
    ? { output: 'export', trailingSlash: true }
    : {}),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

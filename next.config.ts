import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  // H1 FIX: Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        // H1 FIX: Add CSP Header
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com; img-src 'self' https://*.blob.vercel-storage.com data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://*.blob.vercel-storage.com;" },
      ],
    },
  ],
  images: {
    remotePatterns: [
      // M7 FIX: Removed picsum.photos
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      }
    ],
  },
};

export default nextConfig;

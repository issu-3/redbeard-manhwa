import type { NextConfig } from "next";
import "./src/env";

const isCapacitor = process.env.NEXT_PUBLIC_CAPACITOR === 'true';

const nextConfig: NextConfig = {
  compress: false,
  output: isCapacitor ? 'export' : undefined,
  trailingSlash: isCapacitor,
  typescript: {
    ignoreBuildErrors: isCapacitor,
  },
  experimental: isCapacitor ? undefined : {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  allowedDevOrigins: ['10.156.22.77'],
  // H1 FIX: Security headers (not supported in static export)
  headers: isCapacitor ? undefined : async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
      ],
    },
    {
      source: '/:path*\\.(ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|eot)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/images/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    },
  ],
  images: {
    unoptimized: true, // Bypass Next.js Image Optimization to eliminate Vercel 402 errors and serve WebP directly from R2 CDN
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
  },
};

export default nextConfig;

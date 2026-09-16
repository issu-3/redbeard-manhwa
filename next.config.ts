import type { NextConfig } from "next";
import "./src/env";

const isCapacitor = process.env.NEXT_PUBLIC_CAPACITOR === 'true';

const nextConfig: NextConfig = {
  compress: false,
  output: isCapacitor ? 'export' : undefined,
  typescript: {
    ignoreBuildErrors: isCapacitor,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // H1 FIX: Security headers (not supported in static export)
  headers: isCapacitor ? undefined : async () => [
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
    unoptimized: isCapacitor, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
  },
};

export default nextConfig;

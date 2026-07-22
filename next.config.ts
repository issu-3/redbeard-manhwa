import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // H1 FIX: Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        // CSP: Allow ad networks (AdSense, Adsterra, Monetag, PropellerAds)
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.adsterra.com https://*.adstera.com https://*.monetag.com https://*.propellerads.com https://*.propellerclick.com https://*.surfe.pro https://*.outbrain.com https://*.bidgear.com blob:; img-src 'self' https://*.blob.vercel-storage.com https://*.adsterra.com https://*.adstera.com data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://*.blob.vercel-storage.com https://*.adsterra.com https://*.adstera.com https://*.monetag.com https://*.propellerads.com; frame-src 'self' https://*.adsterra.com https://*.adstera.com https://pagead2.googlesyndication.com https://*.monetag.com https://*.propellerads.com;" },
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

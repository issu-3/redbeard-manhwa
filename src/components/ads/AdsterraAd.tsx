'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AdsterraAdProps {
  placement: 'TOP' | 'RIGHT_RAIL' | 'MID' | 'BOTTOM';
  className?: string;
}

// ADSTERRA CONFIGURATION
// Replace the placeholder keys with actual Zone IDs from your Adsterra dashboard.
// E.g., process.env.NEXT_PUBLIC_ADSTERRA_TOP or hardcode them here.
const AD_CONFIG = {
  TOP: {
    key: process.env.NEXT_PUBLIC_ADSTERRA_TOP || 'TOP_ZONE_ID_PLACEHOLDER',
    width: 728, // Standard leaderboard. Use CSS to scale or hide on mobile if you have a separate mobile zone
    height: 90,
  },
  RIGHT_RAIL: {
    key: process.env.NEXT_PUBLIC_ADSTERRA_RIGHT_RAIL || 'RIGHT_RAIL_ZONE_ID_PLACEHOLDER',
    width: 160, // Standard wide skyscraper
    height: 600,
  },
  MID: {
    key: process.env.NEXT_PUBLIC_ADSTERRA_MID || 'MID_ZONE_ID_PLACEHOLDER',
    width: 300, // Medium rectangle (good for mobile & desktop)
    height: 250,
  },
  BOTTOM: {
    key: process.env.NEXT_PUBLIC_ADSTERRA_BOTTOM || 'BOTTOM_ZONE_ID_PLACEHOLDER',
    width: 300, // Medium rectangle
    height: 250,
  }
};

export function AdsterraAd({ placement, className }: AdsterraAdProps) {
  const [mounted, setMounted] = useState(false);
  const config = AD_CONFIG[placement];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR placeholder to prevent layout shift (CLS)
    return (
      <div 
        className={cn("bg-transparent flex items-center justify-center", className)}
        style={{ width: '100%', minHeight: config.height }}
      />
    );
  }

  // Using srcDoc iframe safely sandboxes the Adsterra script from React.
  // This prevents document.write() from destroying the React root, 
  // avoids window.atOptions conflicts between multiple ads on the same page,
  // and gracefully fails if an adblocker blocks the invoke.js script.
  const srcDoc = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
      </style>
    </head>
    <body>
      <script type="text/javascript">
        atOptions = {
          'key' : '${config.key}',
          'format' : 'iframe',
          'height' : ${config.height},
          'width' : ${config.width},
          'params' : {}
        };
      </script>
      <script type="text/javascript" src="//www.highperformanceformat.com/${config.key}/invoke.js"></script>
    </body>
    </html>
  `;

  return (
    <div 
      className={cn("flex justify-center items-center overflow-hidden", className)}
      style={{ minHeight: config.height }}
    >
      <iframe 
        title={`Adsterra Ad - ${placement}`}
        srcDoc={srcDoc}
        width={config.width}
        height={config.height}
        frameBorder="0"
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        className="max-w-full"
      />
    </div>
  );
}

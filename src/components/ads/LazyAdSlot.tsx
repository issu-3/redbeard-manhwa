'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

type Placement = 'homepage' | 'reader' | 'search' | 'series' | 'sidebar' | 'footer' | 'in_feed' | 'header';

interface LazyAdSlotProps {
  placement: Placement;
  provider: string;
  html?: string | null;
  adsenseClientId?: string | null;
}

const FallbackPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-surface border border-border/20 text-text-muted text-sm -z-10 rounded-lg pointer-events-none">
    <span className="opacity-50 tracking-widest uppercase text-xs font-semibold">Advertisement</span>
  </div>
);

export function LazyAdSlot({ placement, provider, html, adsenseClientId }: LazyAdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '500px',
        threshold: 0,
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, []);

  const minHeightClass = placement === 'sidebar' ? 'min-h-[250px]' : 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  return (
    <div ref={containerRef} className={containerClass} data-provider={provider}>
      <FallbackPlaceholder />
      
      {isInView && provider === 'adsense' && !html && adsenseClientId ? (
        <>
          <ins className="adsbygoogle"
               style={{ display: 'block', width: '100%', height: '100%', position: 'relative', zIndex: 10 }}
               data-ad-client={adsenseClientId}
               data-ad-slot="auto"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
          <Script id={`adsense-${placement}`} strategy="afterInteractive">
            {`(adsbygoogle = window.adsbygoogle || []).push({});`}
          </Script>
        </>
      ) : null}

      {isInView && html && provider !== 'adsense' ? (
        <iframe
          title={`Ad-${placement}`}
          src={`/api/ads/render?placement=${placement}`}
          width="100%"
          height="100%"
          style={{ border: 'none', position: 'absolute', top: 0, left: 0, zIndex: 10 }}
          scrolling="no"
        />
      ) : null}
    </div>
  );
}

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
  const injectedRef = useRef(false);

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

  // Dynamically inject HTML scripts to guarantee execution context
  useEffect(() => {
    if (!isInView || !html || injectedRef.current || !containerRef.current) return;
    
    // Check if it's AdSense (handled separately via next/script in render)
    if (provider === 'adsense' && !html) return;

    injectedRef.current = true;
    const container = containerRef.current;
    
    // We create a temporary element to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // First, append any non-script elements (e.g. wrapper divs, iframes)
    Array.from(doc.body.childNodes).forEach(node => {
      if (node.nodeName.toLowerCase() !== 'script') {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Then, properly create and append <script> elements so the browser executes them
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.appendChild(document.createTextNode(script.innerHTML));
      container.appendChild(newScript);
    });
  }, [isInView, html, provider]);

  const minHeightClass = placement === 'sidebar' ? 'min-h-[250px]' : 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  return (
    <div ref={containerRef} className={containerClass} data-provider={provider}>
      <FallbackPlaceholder />
      
      {isInView && provider === 'adsense' && !html && adsenseClientId ? (
        <>
          <ins className="adsbygoogle"
               style={{ display: 'block', width: '100%', height: '100%' }}
               data-ad-client={adsenseClientId}
               data-ad-slot="auto"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
          <Script id={`adsense-${placement}`} strategy="afterInteractive">
            {`(adsbygoogle = window.adsbygoogle || []).push({});`}
          </Script>
        </>
      ) : null}
    </div>
  );
}

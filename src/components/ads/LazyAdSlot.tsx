'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const adContentRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const injectedRef = useRef(false);

  // IntersectionObserver: trigger load when within 500px of viewport
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
      { rootMargin: '500px', threshold: 0 }
    );

    observer.observe(currentRef);
    return () => observer.disconnect();
  }, []);

  // Direct DOM injection for ad network scripts (Adsterra, Monetag, PropellerAds)
  // This uses createElement('script') which the browser executes natively.
  // No iframes, no dangerouslySetInnerHTML, no Next.js <Script> for third-party HTML.
  const injectAdScripts = useCallback(() => {
    if (injectedRef.current || !adContentRef.current || !html) return;
    injectedRef.current = true;

    const container = adContentRef.current;

    // Parse the raw HTML string into a temporary DOM
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Step 1: Append all non-script nodes (divs, ins, etc.) into the container
    const childNodes = Array.from(temp.childNodes);
    childNodes.forEach(node => {
      if (node.nodeName.toLowerCase() !== 'script') {
        container.appendChild(node.cloneNode(true));
      }
    });

    // Step 2: For each <script> tag, create a NEW script element via DOM API.
    // innerHTML-inserted <script> tags do NOT execute. createElement('script') does.
    const scriptElements = temp.querySelectorAll('script');
    scriptElements.forEach(originalScript => {
      const executableScript = document.createElement('script');
      
      // Copy all attributes (src, async, type, data-*, etc.)
      Array.from(originalScript.attributes).forEach(attr => {
        executableScript.setAttribute(attr.name, attr.value);
      });

      // Copy inline script content
      if (originalScript.textContent) {
        executableScript.textContent = originalScript.textContent;
      }

      // Append to the ad container — browser will execute immediately
      container.appendChild(executableScript);
    });
  }, [html]);

  // Trigger injection when slot becomes visible
  useEffect(() => {
    if (!isInView || !html || provider === 'adsense') return;
    // Small delay to ensure the ad content div is mounted in the DOM
    const timer = requestAnimationFrame(() => injectAdScripts());
    return () => cancelAnimationFrame(timer);
  }, [isInView, html, provider, injectAdScripts]);

  const minHeightClass = placement === 'sidebar' ? 'min-h-[250px]' : 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  return (
    <div ref={containerRef} className={containerClass} data-provider={provider}>
      <FallbackPlaceholder />

      {/* AdSense: uses its own <ins> + push pattern */}
      {isInView && provider === 'adsense' && !html && adsenseClientId ? (
        <>
          <ins className="adsbygoogle"
               style={{ display: 'block', width: '100%', height: '100%', position: 'relative', zIndex: 10 }}
               data-ad-client={adsenseClientId}
               data-ad-slot="auto"
               data-ad-format="auto"
               data-full-width-responsive="true" />
          <Script id={`adsense-${placement}`} strategy="afterInteractive">
            {`(adsbygoogle = window.adsbygoogle || []).push({});`}
          </Script>
        </>
      ) : null}

      {/* Third-party ad networks: direct DOM injection container */}
      {isInView && html && provider !== 'adsense' ? (
        <div
          ref={adContentRef}
          className="relative z-10 w-full"
          data-ad-placement={placement}
        />
      ) : null}
    </div>
  );
}


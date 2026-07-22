'use client';

import { useEffect, useRef, useState } from 'react';

interface AdsterraRendererProps {
  placement: string;
  html: string;
}

const FallbackPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-surface border border-border/20 text-text-muted text-sm -z-10 rounded-lg pointer-events-none">
    <span className="opacity-50 tracking-widest uppercase text-xs font-semibold">Advertisement</span>
  </div>
);

export function AdsterraRenderer({ placement, html }: AdsterraRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [decodedHtml, setDecodedHtml] = useState('');

  useEffect(() => {
    try {
      setDecodedHtml(atob(html));
    } catch (e) {
      console.error('Failed to decode ad payload');
    }
  }, [html]);

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

  const minHeightClass = 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  const iframeContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; background: transparent; }
        </style>
      </head>
      <body>
        ${decodedHtml}
      </body>
    </html>
  `;

  return (
    <div ref={containerRef} className={containerClass} data-provider="adsterra">
      <FallbackPlaceholder />
      {isInView && decodedHtml ? (
        <div className="relative z-10 w-full flex justify-center" data-ad-placement={placement}>
          <iframe
            srcDoc={iframeContent}
            style={{ width: '100%', minHeight: '90px', border: 'none', overflow: 'hidden', background: 'transparent' }}
            scrolling="no"
            title="Advertisement"
          />
        </div>
      ) : null}
    </div>
  );
}

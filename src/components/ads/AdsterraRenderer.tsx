'use client';

import { useEffect, useRef, useState } from 'react';

interface AdsterraRendererProps {
  placement: string;
  html: string;
}



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

  const isNative = placement.includes('reader');
  
  // Provide a minimum height to the container to ensure IntersectionObserver 
  // reliably detects it on desktop and to prevent layout shift.
  const minHeightClass = isNative 
    ? "min-h-[250px]" 
    : "min-h-[50px] md:min-h-[90px]";
    
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative items-center ${minHeightClass}`;

  const iframeContent = `
    <!DOCTYPE html>
    <html style="background: transparent !important; color-scheme: dark;">
      <head>
        <meta charset="utf-8">
        <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/">
        <style>
          :root {
            color-scheme: dark;
            background: transparent !important;
          }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important; 
            background: transparent !important; 
            background-color: transparent !important;
          }
          body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            width: 100%;
            height: 100%;
          }
          /* Force any injected wrapper to be transparent */
          body > div, body > iframe {
            background: transparent !important;
            background-color: transparent !important;
          }
        </style>
      </head>
      <body>
        ${decodedHtml}
      </body>
    </html>
  `;

  // Standard banners: 320x50 on mobile, 728x90 on desktop.
  // Native banners: fluid width.
  const iframeClass = isNative 
    ? "w-full min-h-[250px]" 
    : "w-[320px] h-[50px] md:w-[728px] md:h-[90px] max-w-full";

  return (
    <div ref={containerRef} className={containerClass} data-provider="adsterra">
      {isInView && decodedHtml ? (
        <div className="relative z-10 w-full flex justify-center" data-ad-placement={placement}>
          <iframe
            srcDoc={iframeContent}
            className={iframeClass}
            style={{ border: 'none', overflow: 'hidden', background: 'transparent' }}
            scrolling="no"
            title="Advertisement"
            allowTransparency={true}
          />
        </div>
      ) : null}
    </div>
  );
}

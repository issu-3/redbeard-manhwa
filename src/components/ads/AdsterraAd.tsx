'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AdsterraAdProps {
  placement: 'TOP' | 'MID' | 'BOTTOM';
  htmlScript?: string | null;
  className?: string;
}

// Global queue to ensure multiple Adsterra ads on the same page do not collide
// by overwriting window.atOptions or having race conditions with document.write.
let adsterraInjectionQueue = Promise.resolve();

export function AdsterraAd({ placement, htmlScript, className }: AdsterraAdProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !htmlScript) return;
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
  }, [mounted, htmlScript]);

  useEffect(() => {
    if (!isInView || !htmlScript || !containerRef.current || isFailed) return;
    
    let decodedHtml = '';
    try {
      decodedHtml = atob(htmlScript);
    } catch (e) {
      console.error('[Adsterra] Failed to decode ad payload');
      setIsFailed(true);
      return;
    }

    // Parse the official Adsterra banner script for its configuration
    const keyMatch = decodedHtml.match(/['"]key['"]\s*:\s*['"]([^'"]+)['"]/);
    const formatMatch = decodedHtml.match(/['"]format['"]\s*:\s*['"]([^'"]+)['"]/);
    const heightMatch = decodedHtml.match(/['"]height['"]\s*:\s*(\d+)/);
    const widthMatch = decodedHtml.match(/['"]width['"]\s*:\s*(\d+)/);
    const invokeMatch = decodedHtml.match(/src=['"]([^'"]+invoke\.js)['"]/);

    if (!keyMatch || !invokeMatch) {
      console.warn(`[Adsterra] Malformed script configuration for placement ${placement}.`);
      setIsFailed(true);
      return;
    }

    const adOptions = {
      key: keyMatch[1],
      format: formatMatch ? formatMatch[1] : 'iframe',
      height: heightMatch ? parseInt(heightMatch[1], 10) : 60,
      width: widthMatch ? parseInt(widthMatch[1], 10) : 468,
      params: {}
    };
    
    const invokeUrl = invokeMatch[1];
    const container = containerRef.current;

    // Prevent duplicate injection if React strict mode double-fires
    if (container.hasChildNodes()) return;

    let isSubscribed = true;

    // Queue the injection to isolate window.atOptions and document.write
    adsterraInjectionQueue = adsterraInjectionQueue.then(() => {
      return new Promise<void>((resolve) => {
        if (!isSubscribed) {
          resolve();
          return;
        }

        // 1. Set the global configuration specifically for THIS ad instance
        (window as any).atOptions = adOptions;

        // 2. Safely intercept document.write to prevent React SPA destruction
        // Adsterra's invoke.js heavily relies on document.write to output its ad iframe.
        const originalWrite = document.write;
        document.write = (htmlString: string) => {
          const temp = document.createElement('div');
          temp.innerHTML = htmlString;
          Array.from(temp.childNodes).forEach(node => {
            container.appendChild(node);
          });
        };

        // 3. Inject the invoke.js script
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = invokeUrl;
        script.async = true;

        const cleanup = () => {
          document.write = originalWrite;
          resolve();
        };

        script.onload = cleanup;
        script.onerror = () => {
          console.warn(`[Adsterra] Failed to load invoke.js for ${placement}`);
          cleanup();
        };

        container.appendChild(script);
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [isInView, htmlScript, isFailed, placement]);

  if (!htmlScript || isFailed) {
    return null;
  }

  // Fallback dimensions for standard Adsterra 468x60 banner to maintain space
  const minHeight = 60;

  return (
    <div 
      className={cn("flex justify-center items-center overflow-hidden w-full max-w-full", className)}
      style={{ minHeight }}
    >
      <div 
        ref={containerRef}
        className="flex justify-center items-center overflow-hidden w-full max-w-full"
      />
    </div>
  );
}

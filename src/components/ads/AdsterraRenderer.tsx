'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  const adContentRef = useRef<HTMLDivElement>(null);
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
      { rootMargin: '500px', threshold: 0 }
    );

    observer.observe(currentRef);
    return () => observer.disconnect();
  }, []);

  const injectAdScripts = useCallback(() => {
    if (injectedRef.current || !adContentRef.current || !html) return;
    injectedRef.current = true;

    const container = adContentRef.current;
    const temp = document.createElement('div');
    
    try {
      temp.innerHTML = atob(html);
    } catch (e) {
      console.error('Failed to decode advertisement payload');
      return;
    }

    const childNodes = Array.from(temp.childNodes);
    childNodes.forEach(node => {
      if (node.nodeName.toLowerCase() !== 'script') {
        container.appendChild(node.cloneNode(true));
      }
    });

    const scriptElements = temp.querySelectorAll('script');
    scriptElements.forEach(originalScript => {
      const executableScript = document.createElement('script');
      
      Array.from(originalScript.attributes).forEach(attr => {
        executableScript.setAttribute(attr.name, attr.value);
      });

      if (originalScript.textContent) {
        executableScript.textContent = originalScript.textContent;
      }

      container.appendChild(executableScript);
    });
  }, [html]);

  useEffect(() => {
    if (!isInView || !html) return;
    const timer = requestAnimationFrame(() => injectAdScripts());
    return () => cancelAnimationFrame(timer);
  }, [isInView, html, injectAdScripts]);

  const minHeightClass = 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  return (
    <div ref={containerRef} className={containerClass} data-provider="adsterra">
      <FallbackPlaceholder />
      {isInView && html ? (
        <div
          ref={adContentRef}
          className="relative z-10 w-full flex justify-center"
          data-ad-placement={placement}
        />
      ) : null}
    </div>
  );
}

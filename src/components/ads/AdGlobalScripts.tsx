'use client';

import { useEffect, useRef, useCallback } from 'react';

export function AdGlobalScripts({
  adsterraPopunder,
  adsterraSocialBar,
  monetagGlobal
}: {
  adsterraPopunder?: string | null;
  adsterraSocialBar?: string | null;
  monetagGlobal?: string | null;
}) {
  const injectedRef = useRef(false);

  const injectScript = useCallback((html: string) => {
    const temp = document.createElement('div');
    try {
      temp.innerHTML = atob(html);
    } catch (e) {
      console.error('Failed to decode global advertisement payload');
      return;
    }

    const childNodes = Array.from(temp.childNodes);
    childNodes.forEach(node => {
      if (node.nodeName.toLowerCase() !== 'script') {
        document.body.appendChild(node.cloneNode(true));
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

      document.body.appendChild(executableScript);
    });
  }, []);

  useEffect(() => {
    if (injectedRef.current) return;
    injectedRef.current = true;

    // Small delay to ensure body is fully parsed
    const timer = setTimeout(() => {
      if (adsterraPopunder) injectScript(adsterraPopunder);
      if (adsterraSocialBar) injectScript(adsterraSocialBar);
      if (monetagGlobal) injectScript(monetagGlobal);
    }, 500);

    return () => clearTimeout(timer);
  }, [adsterraPopunder, adsterraSocialBar, monetagGlobal, injectScript]);

  return null;
}

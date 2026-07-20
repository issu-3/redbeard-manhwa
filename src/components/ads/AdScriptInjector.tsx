import Script from 'next/script';
import DOMPurify from 'isomorphic-dompurify';

export function AdScriptInjector({ html, provider, placement }: { html: string, provider: string, placement: string }) {
  if (!html) return null;

  // Parse scripts using regex
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptTag = match[0];
    const innerHTML = match[1];
    const srcMatch = scriptTag.match(/src=["'](.*?)["']/i);
    const src = srcMatch ? srcMatch[1] : null;
    scripts.push({ src, innerHTML });
  }

  // Extract non-script HTML for elements like <div> or <iframe>
  let nonScriptHtml = html.replace(scriptRegex, '').trim();
  
  // Sanitize the HTML before injecting
  if (nonScriptHtml) {
    // We allow iframes for ads
    nonScriptHtml = DOMPurify.sanitize(nonScriptHtml, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    });
  }

  return (
    <>
      {nonScriptHtml ? (
        <div dangerouslySetInnerHTML={{ __html: nonScriptHtml }} />
      ) : null}
      
      {scripts.map((script, index) => {
        if (script.src) {
          return (
            <Script
              key={`${provider}-${placement}-${index}-src`}
              src={script.src}
              strategy="afterInteractive"
              crossOrigin="anonymous"
            />
          );
        } else if (script.innerHTML.trim()) {
          return (
            <Script
              key={`${provider}-${placement}-${index}-inline`}
              id={`${provider}-${placement}-${index}-inline`}
              strategy="afterInteractive"
            >
              {script.innerHTML}
            </Script>
          );
        }
        return null;
      })}
    </>
  );
}

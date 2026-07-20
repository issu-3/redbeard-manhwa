import Script from 'next/script';
import sanitizeHtml from 'sanitize-html';

export function AdScriptInjector({ html, provider }: { html: string, provider: string }) {
  if (!html) return null;

  // Simple string hashing for inline scripts
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit int
    }
    return Math.abs(hash).toString(16);
  };

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
  
  // H2 FIX: Sanitize the remaining HTML to prevent XSS
  if (nonScriptHtml) {
    nonScriptHtml = sanitizeHtml(nonScriptHtml, {
      allowedTags: ['div', 'span', 'iframe', 'a', 'img', 'ins'],
      allowedAttributes: {
        '*': ['style', 'class', 'id', 'data-*'],
        'iframe': ['src', 'width', 'height', 'frameborder', 'scrolling', 'marginwidth', 'marginheight'],
        'a': ['href', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height'],
        'ins': ['class', 'style', 'data-ad-client', 'data-ad-slot', 'data-ad-format', 'data-full-width-responsive']
      },
      allowedIframeHostnames: ['pagead2.googlesyndication.com', 'www.google.com'],
    });
  }

  return (
    <>
      {nonScriptHtml ? (
        <div dangerouslySetInnerHTML={{ __html: nonScriptHtml }} />
      ) : null}
      
      {scripts.map((script, index) => {
        if (script.src) {
          // External scripts can use their URL as a unique ID for deduplication
          const srcHash = hashString(script.src);
          return (
            <Script
              key={`${provider}-src-${srcHash}`}
              id={`${provider}-src-${srcHash}`}
              src={script.src}
              strategy="afterInteractive"
              crossOrigin="anonymous"
            />
          );
        } else if (script.innerHTML.trim()) {
          // Inline scripts use the hash of their content as a unique ID
          const contentHash = hashString(script.innerHTML.trim());
          return (
            <Script
              key={`${provider}-inline-${contentHash}`}
              id={`${provider}-inline-${contentHash}`}
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

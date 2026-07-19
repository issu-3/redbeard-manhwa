'use client';

export function RawHtmlIframe({ html, title = "Advertisement" }: { html: string, title?: string }) {
  if (!html) return null;
  
  const iframeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; overflow: hidden; background: transparent; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return (
    <iframe
      title={title}
      srcDoc={iframeHtml}
      className="w-full border-none min-h-[90px] overflow-hidden bg-transparent"
      scrolling="no"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    />
  );
}

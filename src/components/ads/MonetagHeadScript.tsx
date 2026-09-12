import Script from 'next/script';

export function MonetagHeadScript({ scriptString }: { scriptString?: string | null }) {
  if (!scriptString) return null;

  // Safely parse the DB script string: <script src="..." data-zone="..." async data-cfasync="false"></script>
  const srcMatch = scriptString.match(/src=["']([^"']+)["']/);
  const zoneMatch = scriptString.match(/data-zone=["']([^"']+)["']/);

  if (!srcMatch) return null;

  const src = srcMatch[1];
  const zone = zoneMatch ? zoneMatch[1] : undefined;
  
  const isAsync = /async/.test(scriptString);
  const isCfAsyncFalse = /data-cfasync=["']false["']/.test(scriptString);

  // Return standard script element (using next/script or native script)
  // We use native <script> here to ensure exact HTML output matching the user's requirement
  // and to avoid any next/script hydration behaviors.
  return (
    <script
      src={src}
      data-zone={zone}
      async={isAsync}
      data-cfasync={isCfAsyncFalse ? "false" : undefined}
    />
  );
}

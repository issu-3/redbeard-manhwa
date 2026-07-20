import { NextRequest, NextResponse } from 'next/server';
import { getCachedSettings } from '@/app/actions/public/settings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placement = searchParams.get('placement');
  
  if (!placement) {
    return new NextResponse('Missing placement', { status: 400 });
  }

  const settings = await getCachedSettings();
  
  const placementSetting = settings[`ads_placement_${placement}`] || 'none';
  if (placementSetting === 'none') {
    return new NextResponse('', { status: 200 });
  }
  
  let providerToUse = placementSetting;
  
  const getProviderConfig = (p: string) => {
    if (settings[`ads_enabled_${p}`] !== 'true') return null;
    if (p === 'adsense' && settings.adsenseId) return 'adsense';
    if (p === 'monetag' && settings.ads_monetag_script) return settings.ads_monetag_script;
    if (p === 'propeller' && settings.ads_propeller_script) return settings.ads_propeller_script;
    if (p === 'adsterra') {
      const isNative = placement === 'sidebar' || placement === 'reader' || placement === 'in_feed';
      const script = isNative ? settings.ads_adsterra_native_banner : settings.ads_adsterra_banner;
      return script || null;
    }
    return null;
  };

  let specificScriptToInject: string | null = null;

  if (placementSetting === 'auto') {
    const priority = (settings.ads_provider_priority || 'adsense,monetag,adsterra,propeller').split(',');
    for (const p of priority) {
      const config = getProviderConfig(p);
      if (config) {
        providerToUse = p;
        if (typeof config === 'string' && config !== 'adsense') {
          specificScriptToInject = config;
        }
        break;
      }
    }
  } else {
    const config = getProviderConfig(providerToUse);
    if (config && typeof config === 'string' && config !== 'adsense') {
      specificScriptToInject = config;
    }
  }

  if (providerToUse === 'adsense' || !specificScriptToInject) {
    return new NextResponse('', { status: 200 });
  }

  const htmlResponse = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            overflow: hidden; 
            background: transparent; 
          }
        </style>
      </head>
      <body>
        ${specificScriptToInject}
      </body>
    </html>
  `;

  return new NextResponse(htmlResponse, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

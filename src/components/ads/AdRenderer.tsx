import { getCachedSettings } from '@/app/actions/public/settings';
import { AdsterraRenderer } from './AdsterraRenderer';
import { MonetagRenderer } from './MonetagRenderer';

type Placement = 'homepage' | 'series_detail' | 'reader_top' | 'reader_middle' | 'reader_bottom' | 'footer';

export async function AdRenderer({ placement }: { placement: Placement }) {
  const settings = await getCachedSettings();
  
  const placementSetting = settings[`ads_placement_${placement}`] || 'none';
  
  if (placementSetting === 'none') {
    return null;
  }
  
  let providerToUse = placementSetting;
  
  const getProviderConfig = (p: string) => {
    if (settings[`ads_enabled_${p}`] !== 'true') return null;
    if (p === 'monetag') {
      return settings.ads_monetag_banner_script || settings.ads_monetag_global_script || null;
    }
    if (p === 'adsterra') {
      const isNative = placement === 'reader_top' || placement === 'reader_middle' || placement === 'reader_bottom';
      // Prefer the appropriate format but fall back to the other if empty
      const primaryScript = isNative ? settings.ads_adsterra_native_banner : settings.ads_adsterra_banner;
      const fallbackScript = isNative ? settings.ads_adsterra_banner : settings.ads_adsterra_native_banner;
      return primaryScript || fallbackScript || null;
    }
    return null;
  };

  let specificScriptToInject: string | null = null;

  if (placementSetting === 'auto') {
    const priority = (settings.ads_provider_priority || 'adsterra,monetag').split(',');
    for (const p of priority) {
      const config = getProviderConfig(p);
      if (config) {
        providerToUse = p;
        specificScriptToInject = config;
        break;
      }
    }
  } else {
    const config = getProviderConfig(providerToUse);
    if (!config) return null;
    specificScriptToInject = config;
  }
  
  if (providerToUse === 'none' || providerToUse === 'auto' || !specificScriptToInject) {
    return null;
  }

  // Base64 encode the script to prevent WAF/XSS filters from stripping or breaking the Next.js Flight payload
  const encodedScript = Buffer.from(specificScriptToInject).toString('base64');

  if (providerToUse === 'adsterra') {
    return <AdsterraRenderer placement={placement} html={encodedScript} />;
  }

  if (providerToUse === 'monetag') {
    return <MonetagRenderer placement={placement} html={encodedScript} />;
  }

  return null;
}

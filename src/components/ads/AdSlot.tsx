import { getCachedSettings } from '@/app/actions/public/settings';
import { LazyAdSlot } from './LazyAdSlot';

type Placement = 'homepage' | 'reader' | 'search' | 'series' | 'sidebar' | 'footer' | 'in_feed' | 'header';

export async function AdSlot({ placement }: { placement: Placement }) {
  const settings = await getCachedSettings();
  
  const placementSetting = settings[`ads_placement_${placement}`] || 'none';
  
  if (placementSetting === 'none') {
    return null;
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
    if (!config) return null;
    if (typeof config === 'string' && config !== 'adsense') {
      specificScriptToInject = config;
    }
  }
  
  if (providerToUse === 'none' || providerToUse === 'auto') return null;

  // Handle AdSense specific configs
  let adsenseClientId = null;
  if (providerToUse === 'adsense') {
    adsenseClientId = settings.adsenseId;
    if (settings.ads_adsense_manual_unit) {
      specificScriptToInject = settings.ads_adsense_manual_unit;
    }
  }

  return (
    <LazyAdSlot 
      placement={placement}
      provider={providerToUse}
      html={specificScriptToInject}
      adsenseClientId={adsenseClientId}
    />
  );
}

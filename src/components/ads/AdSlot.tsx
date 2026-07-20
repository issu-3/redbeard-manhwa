import Script from 'next/script';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdScriptInjector } from './AdScriptInjector';

type Placement = 'header' | 'footer' | 'sidebar' | 'reader' | 'in_feed';

const FallbackPlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-surface border border-border/20 text-text-muted text-sm -z-10 rounded-lg pointer-events-none">
    <span className="opacity-50 tracking-widest uppercase text-xs font-semibold">Advertisement</span>
  </div>
);

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

  const minHeightClass = placement === 'sidebar' ? 'min-h-[250px]' : 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  // Render specific provider
  if (providerToUse === 'adsense') {
    const clientId = settings.adsenseId;
    
    // Check if there is a manual ad unit override
    if (settings.ads_adsense_manual_unit) {
      return (
        <div className={containerClass} data-provider="adsense">
          <FallbackPlaceholder />
          <AdScriptInjector html={settings.ads_adsense_manual_unit} provider="adsense" />
        </div>
      );
    }
    
    // Otherwise use default responsive ad unit
    return (
      <div className={containerClass} data-provider="adsense">
        <FallbackPlaceholder />
        <ins className="adsbygoogle"
             style={{ display: 'block', width: '100%', height: '100%' }}
             data-ad-client={clientId}
             data-ad-slot="auto"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <Script id={`adsense-${placement}`} strategy="afterInteractive">
          {`(adsbygoogle = window.adsbygoogle || []).push({});`}
        </Script>
      </div>
    );
  }
  
  if (specificScriptToInject) {
    return (
      <div className={containerClass} data-provider={providerToUse}>
        <FallbackPlaceholder />
        <AdScriptInjector html={specificScriptToInject} provider={providerToUse} />
      </div>
    );
  }

  return null;
}

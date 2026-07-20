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
  
  if (placementSetting === 'auto') {
    const priority = (settings.ads_provider_priority || 'adsense,monetag,adsterra,propeller').split(',');
    for (const p of priority) {
      const codeKey = p === 'adsense' ? 'adsenseId' : p === 'propeller' ? 'propellerAdsCode' : `${p}Code`;
      if (settings[`ads_enabled_${p}`] === 'true' && settings[codeKey]) {
        providerToUse = p;
        break;
      }
    }
  } else {
    // If explicitly set, ensure it's enabled
    const codeKey = providerToUse === 'adsense' ? 'adsenseId' : providerToUse === 'propeller' ? 'propellerAdsCode' : `${providerToUse}Code`;
    if (settings[`ads_enabled_${providerToUse}`] !== 'true' || !settings[codeKey]) {
      return null;
    }
  }
  
  if (providerToUse === 'none' || providerToUse === 'auto') return null;

  const minHeightClass = placement === 'sidebar' ? 'min-h-[250px]' : 'min-h-[90px]';
  const containerClass = `w-full overflow-hidden flex justify-center my-4 ad-container relative ${minHeightClass} items-center`;

  // Render specific provider
  if (providerToUse === 'adsense') {
    const clientId = settings.adsenseId;
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
  
  if (providerToUse === 'monetag') {
    return (
      <div className={containerClass} data-provider="monetag">
        <FallbackPlaceholder />
        <AdScriptInjector html={settings.monetagCode || ''} provider="monetag" />
      </div>
    );
  }
  
  if (providerToUse === 'adsterra') {
    return (
      <div className={containerClass} data-provider="adsterra">
        <FallbackPlaceholder />
        <AdScriptInjector html={settings.adsterraCode || ''} provider="adsterra" />
      </div>
    );
  }

  if (providerToUse === 'propeller') {
    return (
      <div className={containerClass} data-provider="propeller">
        <FallbackPlaceholder />
        <AdScriptInjector html={settings.propellerAdsCode || ''} provider="propeller" />
      </div>
    );
  }

  return null;
}

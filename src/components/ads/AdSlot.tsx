import Script from 'next/script';
import { getCachedSettings } from '@/app/actions/admin/settings';

type Placement = 'header' | 'footer' | 'sidebar' | 'reader' | 'in_feed';

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

  // Render specific provider
  if (providerToUse === 'adsense') {
    const clientId = settings.adsenseId;
    return (
      <div className="w-full overflow-hidden flex justify-center my-4 ad-container relative min-h-[90px] bg-background/50 border border-border/50 rounded-lg items-center text-text-muted text-xs" data-provider="adsense">
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
      <div className="w-full overflow-hidden flex justify-center my-4 ad-container" data-provider="monetag">
        <div dangerouslySetInnerHTML={{ __html: settings.monetagCode }} />
      </div>
    );
  }
  
  if (providerToUse === 'adsterra') {
    return (
      <div className="w-full overflow-hidden flex justify-center my-4 ad-container" data-provider="adsterra">
        <div dangerouslySetInnerHTML={{ __html: settings.adsterraCode }} />
      </div>
    );
  }

  if (providerToUse === 'propeller') {
    return (
      <div className="w-full overflow-hidden flex justify-center my-4 ad-container" data-provider="propeller">
        <div dangerouslySetInnerHTML={{ __html: settings.propellerAdsCode }} />
      </div>
    );
  }

  return null;
}

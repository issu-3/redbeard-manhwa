import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/providers/session-provider';
import { Toaster } from 'sonner';
import { getCachedSettings } from '@/app/actions/public/settings';
import { APP_URL } from '@/lib/constants';
import { AdGlobalScripts } from '@/components/ads/AdGlobalScripts';
import { MonetagHeadScript } from '@/components/ads/MonetagHeadScript';
import { NativeInitializer } from '@/components/native/NativeInitializer';
import { NetworkListener } from '@/components/shared/NetworkListener';

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getCachedSettings();
  const theme = settings.defaultTheme || 'system';
  
  const siteUrl = APP_URL || 'http://localhost:3000';
  const siteName = settings.siteName || 'REDBEARD';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        url: siteUrl,
        name: siteName,
        description: settings.seo_site_description || 'Premium reading platform.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        url: siteUrl,
        name: siteName,
        logo: `${siteUrl}/logo.png`,
        sameAs: [
          settings.seo_twitter_handle ? `https://twitter.com/${settings.seo_twitter_handle.replace('@', '')}` : '',
          settings.youtubeUrl || '',
        ].filter(Boolean),
      }
    ],
  };

  return (
    <>
      <MonetagHeadScript 
        scriptString={settings.ads_enabled_monetag === 'true' ? settings.ads_monetag_global_script : null} 
      />
      <AdGlobalScripts 
        adsterraPopunder={settings.ads_enabled_adsterra === 'true' && settings.ads_adsterra_popunder ? Buffer.from(settings.ads_adsterra_popunder).toString('base64') : null}
        adsterraSocialBar={settings.ads_enabled_adsterra === 'true' && settings.ads_adsterra_social_bar ? Buffer.from(settings.ads_adsterra_social_bar).toString('base64') : null}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-white">
        Skip to main content
      </a>
      
      <SessionProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={theme === 'system'}
          forcedTheme={theme !== 'system' ? theme : undefined}
          disableTransitionOnChange
        >
          <NativeInitializer>
            <NetworkListener />
            {children}
            <Toaster position="bottom-right" />
          </NativeInitializer>
        </ThemeProvider>
      </SessionProvider>
    </>
  );
}

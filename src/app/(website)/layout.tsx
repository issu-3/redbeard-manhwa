import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/providers/session-provider';
import { Toaster } from 'sonner';
import { getCachedSettings } from '@/app/actions/public/settings';
import { APP_URL } from '@/lib/constants';
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
        logo: `${siteUrl}/logo-v2.png`, // /logo-v2.png present in /public (v2: same-URL image caches are immutable for 1y, so logo changes need a new path)
        sameAs: [
          settings.seo_twitter_handle ? `https://twitter.com/${settings.seo_twitter_handle.replace('@', '')}` : '',
          settings.youtubeUrl || '',
        ].filter(Boolean),
      }
    ],
  };

  return (
    <>
      {/* Global popup-style ads (Adsterra pop-under + social bar and the
          Monetag site tag, both fed from site settings) were removed on
          2026-11-11 by owner decision: the pop-under hijacked the first
          click on reader, browse and login pages, flinging readers into
          ad tabs. Slot banners (AdRenderer / AdsterraAd / reader banner)
          are unaffected. The DB settings keys remain but are no longer
          injected anywhere. */}
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

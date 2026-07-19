import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/providers/session-provider';
import { Toaster } from 'sonner';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/admin/settings';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSettings();
  
  const siteTitle = settings.seo_site_title || 'REDBEARD - The Ultimate Reading Experience';
  const siteDescription = settings.seo_site_description || 'REDBEARD is a premium manhwa reading platform offering the best reading experience with thousands of manhwa, manga, and webtoon titles.';
  const defaultKeywords = settings.seo_default_keywords ? settings.seo_default_keywords.split(',').map(k => k.trim()) : ['manhwa', 'manga', 'webtoon', 'read manhwa'];
  const robotsSetting = settings.seo_robots || 'index, follow';
  const shouldIndex = robotsSetting.includes('index') && !robotsSetting.includes('noindex');
  const shouldFollow = robotsSetting.includes('follow') && !robotsSetting.includes('nofollow');
  const ogImage = settings.seo_og_image || '/images/og-default.png';
  const twitterHandle = settings.seo_twitter_handle || '@redbeard';

  return {
    title: {
      default: siteTitle,
      template: `%s | ${settings.siteName || 'REDBEARD'}`,
    },
    description: siteDescription,
    keywords: defaultKeywords,
    authors: [{ name: `${settings.siteName || 'REDBEARD'} Team` }],
    creator: settings.siteName || 'REDBEARD',
    metadataBase: new URL(APP_URL || 'http://localhost:3000'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: settings.siteName || 'REDBEARD',
      title: siteTitle,
      description: siteDescription,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      creator: twitterHandle,
    },
    robots: {
      index: shouldIndex,
      follow: shouldFollow,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    verification: {
      google: settings.seo_gsc_verification || undefined,
    },
    manifest: '/manifest.json',
  };
}

export const viewport: Viewport = {
  themeColor: '#0F1115',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
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
        description: settings.seo_site_description || 'Premium manhwa reading platform.',
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
        logo: `${siteUrl}/logo.png`, // Assuming a standard logo path
        sameAs: [
          settings.seo_twitter_handle ? `https://twitter.com/${settings.seo_twitter_handle.replace('@', '')}` : '',
          settings.youtubeUrl || '',
        ].filter(Boolean),
      }
    ],
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable} ${poppins.variable}`}
    >
      {settings.adsenseId && (
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsenseId}`}
          crossOrigin="anonymous"
        />
      )}
      <body className="min-h-screen bg-background font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme={theme}
            enableSystem={theme === 'system'}
            forcedTheme={theme !== 'system' ? theme : undefined}
            disableTransitionOnChange
          >
            {children}
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

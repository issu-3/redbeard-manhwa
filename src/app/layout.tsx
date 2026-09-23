import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
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
  const siteDescription = settings.seo_site_description || 'REDBEARD is a premium reading platform offering the best reading experience with thousands of series.';
  const defaultKeywords = settings.seo_default_keywords ? settings.seo_default_keywords.split(',').map(k => k.trim()) : ['comics', 'manga', 'webtoon', 'read online'];
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
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: settings.siteName || 'REDBEARD',
      title: siteTitle,
      description: siteDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteTitle }],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable} ${poppins.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-background font-inter text-text-primary antialiased selection:bg-primary/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

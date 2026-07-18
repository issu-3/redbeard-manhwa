import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from '@/providers/session-provider';
import { Toaster } from 'sonner';
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

export const metadata: Metadata = {
  title: {
    default: 'REDBEARD — The Ultimate Reading Experience',
    template: '%s | REDBEARD',
  },
  description:
    'REDBEARD is a premium manhwa reading platform offering the best reading experience with thousands of manhwa, manga, and webtoon titles.',
  keywords: [
    'manhwa',
    'manga',
    'manhua',
    'webtoon',
    'read manhwa',
    'read manga',
    'korean comics',
    'webcomic reader',
  ],
  authors: [{ name: 'REDBEARD Team' }],
  creator: 'REDBEARD',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'REDBEARD',
    title: 'REDBEARD — The Ultimate Reading Experience',
    description:
      'REDBEARD is a premium manhwa reading platform offering the best reading experience with thousands of manhwa, manga, and webtoon titles.',
    images: [{ url: '/images/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REDBEARD — The Ultimate Reading Experience',
    description: 'Premium manhwa reading platform.',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large' as const,
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  manifest: '/manifest.json',
};

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
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
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

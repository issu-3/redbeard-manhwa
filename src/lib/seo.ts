import { Metadata } from 'next';
import { APP_NAME, APP_DESCRIPTION, APP_URL } from './constants';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

export function generateMetadata({
  title,
  description = APP_DESCRIPTION,
  image = '/images/og-default.png',
  url = APP_URL,
  type = 'website',
  noindex = false,
}: SEOProps = {}): Metadata {
  const fullTitle = title ? `${title} | ${APP_NAME}` : `${APP_NAME} — The Ultimate Reading Experience`;
  const fullImage = image.startsWith('http') ? image : `${APP_URL}${image}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(APP_URL),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: APP_NAME,
      images: [{ url: fullImage, width: 1200, height: 630, alt: fullTitle }],
      type,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1, 'max-video-preview': -1 },
    other: {
      'theme-color': '#0F1115',
    },
  };
}


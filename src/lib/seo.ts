import { Metadata } from 'next';
import { APP_NAME, APP_DESCRIPTION, APP_URL } from './constants';

export const HARDCODED_FALLBACK_IMAGE = '/images/og-default.png';

export interface SocialImages {
  ogImage: string;
  twitterImage: string;
}

/**
 * Ensures an image path or URL is fully-qualified for social media crawlers.
 */
export function toAbsoluteUrl(url?: string | null): string {
  if (!url || !url.trim()) return `${APP_URL.replace(/\/+$/, '')}${HARDCODED_FALLBACK_IMAGE}`;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${APP_URL.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
}

/**
 * Resolves OG and Twitter social share images following the strict fallback hierarchy:
 * 1. Specific custom image (custom OG / Twitter image, or series cover / chapter image).
 * 2. Saved global defaults from site settings (seo_og_image, seo_twitter_image).
 * 3. Graceful fallback of Twitter image to OG image if Twitter image is not explicitly set.
 * 4. Hardcoded safe project fallback asset (/images/og-default.png).
 */
export function resolveSocialImages(params?: {
  customOgImage?: string | null;
  customTwitterImage?: string | null;
  settings?: Record<string, string> | null;
}): SocialImages {
  const globalOg = params?.settings?.seo_og_image?.trim() || HARDCODED_FALLBACK_IMAGE;
  const globalTwitter = params?.settings?.seo_twitter_image?.trim() || globalOg;

  // 1. Determine OG image candidate
  const ogCandidate = params?.customOgImage?.trim() || globalOg;
  const ogImage = toAbsoluteUrl(ogCandidate);

  // 2. Determine Twitter image candidate
  let twitterCandidate: string;
  if (params?.customTwitterImage?.trim()) {
    twitterCandidate = params.customTwitterImage.trim();
  } else if (params?.customOgImage?.trim()) {
    // If a specific custom OG image was provided for the entity/page, use it for Twitter as well
    twitterCandidate = params.customOgImage.trim();
  } else {
    // Otherwise use global twitter setting, falling back to global OG setting
    twitterCandidate = globalTwitter;
  }
  const twitterImage = toAbsoluteUrl(twitterCandidate);

  return { ogImage, twitterImage };
}

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  twitterImage?: string;
  url?: string;
  type?: 'website' | 'article' | 'book';
  noindex?: boolean;
  settings?: Record<string, string> | null;
}

export function generateMetadata({
  title,
  description = APP_DESCRIPTION,
  image,
  twitterImage,
  url = APP_URL,
  type = 'website',
  noindex = false,
  settings,
}: SEOProps = {}): Metadata {
  const fullTitle = title ? `${title} | ${APP_NAME}` : `${APP_NAME} — The Ultimate Reading Experience`;
  const resolvedImages = resolveSocialImages({
    customOgImage: image,
    customTwitterImage: twitterImage,
    settings,
  });

  return {
    title: { absolute: fullTitle },
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
      images: [{ url: resolvedImages.ogImage, width: 1200, height: 630, alt: fullTitle }],
      type: type === 'book' ? 'website' : type,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [resolvedImages.twitterImage],
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1, 'max-video-preview': -1 },
    other: {
      'theme-color': '#0F1115',
    },
  };
}


import { APP_URL } from './constants';
import { getContentTypeLabel } from './content-types';

export interface SeriesSeoInput {
  title: string;
  slug: string;
  type?: string;
  synopsis?: string | null;
  description?: string | null;
  coverImage?: string | null;
  bannerImage?: string | null;
  genres?: string[];
  tags?: string[];
  isAdult?: boolean;
}

export interface GeneratedSeoData {
  title: string;
  focusKeyword: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  canonical: string;
  ogImage: string;
  twitterImage: string;
  robots: string;
  [key: string]: any;
}

export interface SeoValidationResult {
  score: number;
  missingFields: string[];
  warnings: string[];
  isDuplicateTitle: boolean;
  isDuplicateDesc: boolean;
  isInvalidCanonical: boolean;
}

export function validateCanonicalUrl(url?: string | null, expectedSlug?: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  
  try {
    const parsed = new URL(trimmed);
    if (expectedSlug && !parsed.pathname.includes(`/series/${expectedSlug}`)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function generateDescription(synopsis?: string | null, description?: string | null, title?: string, type?: string): string {
  const typeLabel = getContentTypeLabel(type);
  const text = (synopsis && synopsis.trim().length > 0) 
    ? synopsis 
    : (description || `Download ${title || 'this series'} ${typeLabel} with the latest available chapters. View series information, genres, status and available downloads on REDBEARD.`);
  
  const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  if (cleanText.length <= 160) return cleanText;
  
  let cut = cleanText.substring(0, 157);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 120) {
    cut = cut.substring(0, lastSpace);
  }
  return `${cut}...`;
}

export function generateKeywords(
  title: string,
  type?: string,
  genres: string[] = [],
  tags: string[] = [],
  isAdult: boolean = false
): string {
  const kwSet = new Set<string>();
  if (title && title.trim()) kwSet.add(title.trim());
  
  genres.forEach(g => { if (g && g.trim()) kwSet.add(g.trim()); });
  tags.forEach(t => { if (t && t.trim()) kwSet.add(t.trim()); });
  
  const typeLabel = getContentTypeLabel(type);
  kwSet.add(typeLabel);
  kwSet.add('Download');
  
  const allText = `${title} ${genres.join(' ')} ${tags.join(' ')}`.toLowerCase();
  const adultKeywords = ['adult', '18+', 'mature', 'smut', 'nsfw', 'ecchi'];
  const isAdultSeries = isAdult || adultKeywords.some(w => allText.includes(w));
  if (isAdultSeries) {
    kwSet.add('Adult');
  }
  
  const colorKeywords = ['color', 'full color', 'webtoon'];
  const isColorSeries = colorKeywords.some(w => allText.includes(w));
  if (isColorSeries) {
    kwSet.add('Full Color');
  }
  
  return Array.from(kwSet).join(', ');
}

export function generateSeriesSeo(
  series: SeriesSeoInput,
  existingSeo: any = {},
  forceRegenerate: boolean = false
): GeneratedSeoData {
  const current = typeof existingSeo === 'string' 
    ? (tryParseJson(existingSeo) || {}) 
    : (existingSeo || {});

  const baseUrl = APP_URL.startsWith('http') ? APP_URL : 'https://redbeard-manhwa.vercel.app';
  const defaultCanonical = `${baseUrl}/series/${series.slug}`;

  const typeLabel = getContentTypeLabel(series.type);

  // 1. SEO Title: {Series Title} [Type] - Download | REDBEARD
  const autoTitle = `${series.title} ${typeLabel} - Download | REDBEARD`;
  const title = (!forceRegenerate && current.title && current.title.trim()) ? current.title.trim() : autoTitle;

  // 2. Focus Keyword: {Series Title} [Type]
  const autoFocusKeyword = `${series.title} ${typeLabel}`;
  const focusKeyword = (!forceRegenerate && current.focusKeyword && current.focusKeyword.trim()) 
    ? current.focusKeyword.trim() 
    : autoFocusKeyword;

  // 3. SEO Description: 150-160 chars from Synopsis or Description
  const autoDescription = generateDescription(series.synopsis, series.description, series.title, series.type);
  const description = (!forceRegenerate && current.description && current.description.trim()) 
    ? current.description.trim() 
    : autoDescription;

  // 4. Keywords: combined & deduplicated
  const autoKeywords = generateKeywords(series.title, series.type, series.genres || [], series.tags || [], series.isAdult);
  const keywords = (!forceRegenerate && current.keywords && current.keywords.trim()) 
    ? current.keywords.trim() 
    : autoKeywords;

  // 5. Canonical URL: https://YOUR_DOMAIN/series/{slug}
  const currentCanonical = current.canonicalUrl || current.canonical;
  const isCurrentCanonicalValid = validateCanonicalUrl(currentCanonical, series.slug);
  const canonicalUrl = (!forceRegenerate && isCurrentCanonicalValid && currentCanonical) ? currentCanonical.trim() : defaultCanonical;

  // 6. Open Graph Image: Custom OG -> Banner -> Cover
  const autoOgImage = series.bannerImage || series.coverImage || '/images/og-default.png';
  const ogImage = (!forceRegenerate && current.ogImage && current.ogImage.trim()) 
    ? current.ogImage.trim() 
    : autoOgImage;

  // 7. Twitter Card Image: Custom Twitter -> OG -> Banner -> Cover
  const autoTwitterImage = current.ogImage || series.bannerImage || series.coverImage || '/images/og-default.png';
  const twitterImage = (!forceRegenerate && current.twitterImage && current.twitterImage.trim()) 
    ? current.twitterImage.trim() 
    : autoTwitterImage;

  const robots = (!forceRegenerate && current.robots && current.robots.trim()) 
    ? current.robots.trim() 
    : 'index, follow';

  return {
    ...current,
    title,
    focusKeyword,
    description,
    keywords,
    canonicalUrl,
    canonical: canonicalUrl,
    ogImage,
    twitterImage,
    robots,
  };
}

export function calculateSeriesSeoScore(
  seoRaw: any,
  slug?: string,
  allTitles: Set<string> = new Set(),
  allDescs: Set<string> = new Set()
): SeoValidationResult {
  const seo = typeof seoRaw === 'string' ? (tryParseJson(seoRaw) || {}) : (seoRaw || {});
  
  const missingFields: string[] = [];
  const warnings: string[] = [];
  let points = 0;

  // Check Title (20 pts)
  if (!seo.title || !seo.title.trim()) {
    missingFields.push('Title');
  } else {
    points += 20;
    if (seo.title.length > 60) {
      warnings.push(`SEO Title exceeds 60 characters (${seo.title.length}/60)`);
      points -= 5;
    }
  }

  // Check Description (20 pts)
  if (!seo.description || !seo.description.trim()) {
    missingFields.push('Description');
  } else {
    points += 20;
    if (seo.description.length > 160) {
      warnings.push(`Meta Description exceeds 160 characters (${seo.description.length}/160)`);
      points -= 5;
    }
  }

  // Check Focus Keyword (15 pts)
  if (!seo.focusKeyword || !seo.focusKeyword.trim()) {
    missingFields.push('Focus Keyword');
    warnings.push('Missing Focus Keyword');
  } else {
    points += 15;
  }

  // Check Keywords (10 pts)
  if (!seo.keywords || !seo.keywords.trim()) {
    missingFields.push('Keywords');
  } else {
    points += 10;
  }

  // Check Canonical URL (15 pts)
  const canonical = seo.canonicalUrl || seo.canonical;
  const isValidCanonical = validateCanonicalUrl(canonical, slug);
  if (!canonical || !canonical.trim()) {
    missingFields.push('Canonical URL');
    warnings.push('Empty Canonical URL');
  } else if (!isValidCanonical) {
    warnings.push('Invalid Canonical URL format or mismatch');
    points += 5; // partial points
  } else {
    points += 15;
  }

  // Check OG Image (10 pts)
  if (!seo.ogImage || !seo.ogImage.trim()) {
    missingFields.push('OG Image');
    warnings.push('Missing Open Graph Image');
  } else {
    points += 10;
  }

  // Check Twitter Image (10 pts)
  if (!seo.twitterImage && !seo.ogImage) {
    missingFields.push('Twitter Image');
    warnings.push('Missing Twitter Card Image');
  } else {
    points += 10;
  }

  // Check Duplicates
  let isDuplicateTitle = false;
  let isDuplicateDesc = false;

  if (seo.title && allTitles.has(seo.title.trim())) {
    isDuplicateTitle = true;
    warnings.push('Duplicate SEO Title detected across series');
    points -= 15;
  }
  if (seo.description && allDescs.has(seo.description.trim())) {
    isDuplicateDesc = true;
    warnings.push('Duplicate Meta Description detected across series');
    points -= 10;
  }

  const score = Math.max(0, Math.min(100, points));

  return {
    score,
    missingFields,
    warnings,
    isDuplicateTitle,
    isDuplicateDesc,
    isInvalidCanonical: !isValidCanonical && !!canonical
  };
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

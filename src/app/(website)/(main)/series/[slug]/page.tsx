export const revalidate = 3600;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { Badge } from '@/components/shared/Badge';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { ChapterListSection } from './chapter-list';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { getContentTypeLabel } from '@/lib/content-types';
import type { SeriesCardData } from '@/types';
import { SeriesActionsClient } from '@/components/series/SeriesActionsClient';
import { DescriptionClient } from './description-client';
import { ReviewsSection } from '@/components/series/ReviewsSection';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { resolveSocialImages } from '@/lib/seo';
import { AdRenderer } from '@/components/ads/AdRenderer';
import { unstable_cache } from 'next/cache';
import { cn } from '@/lib/utils';

// OPT-21: Pre-render top 100 most popular series at build time
export async function generateStaticParams() {
  try {
    const series = await prisma.series.findMany({
      orderBy: { totalViews: 'desc' },
      take: 100,
      select: { slug: true }
    });
    return series.map((s) => ({
      slug: s.slug,
    }));
  } catch (error) {
    console.warn('Failed to pre-render series routes during build:', error);
    return [];
  }
}

// OPT-04: Next.js unstable_cache caches across requests; React cache() deduplicates within same request render
const getCachedSeriesDataInternal = unstable_cache(
  async (slug: string) => {
    // OPT-03: Use select instead of include to fetch only needed columns for chapters
    return prisma.series.findUnique({
      where: { slug },
      include: {
        genres: true,
        tags: true,
        authors: true,
        artists: true,
        chapters: {
          where: { isPublished: true },
          orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            number: true,
            label: true,
            title: true,
            slug: true,
            totalPages: true,
            totalViews: true,
            publishedAt: true,
            sourceType: true,
            downloadUrl: true,
            downloadProvider: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, displayName: true, username: true, avatarUrl: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }
      },
    });
  },
  ['series-detail-data'],
  { tags: ['series-data'], revalidate: 3600 }
);

const getSeriesData = cache(async (slug: string) => {
  return getCachedSeriesDataInternal(slug);
});

// OPT-02: Cache recommendation queries with unstable_cache — these change infrequently
const getCachedRelatedSeries = unstable_cache(
  async (seriesId: string, genreIds: string[]) => {
    return prisma.series.findMany({
      where: { 
        id: { not: seriesId },
        genres: { some: { id: { in: genreIds } } }
      },
      take: 6,
      select: SERIES_CARD_SELECT
    });
  },
  ['series-related-data'],
  { tags: ['series-data'], revalidate: 3600 }
);



function getSeoDescription(series: any, seo: Record<string, string>, siteTitle: string, typeLabel: string): string {
  let description = seo.description;
  if (description && description.trim()) return description;

  const prefix = `Read ${series.title} ${typeLabel} online on ${siteTitle}.`;
  let contentText = series.synopsis?.trim() || series.description?.trim() || '';
  contentText = contentText.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  
  if (!contentText) return prefix;

  const combined = `${prefix} ${contentText}`;
  if (combined.length <= 160) return combined;

  let truncated = combined.substring(0, 157);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > prefix.length) {
    return truncated.substring(0, lastPeriod + 1);
  } else {
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > prefix.length ? truncated.substring(0, lastSpace) : truncated) + '...';
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesData(slug);
  const settings = await getCachedSettings();
  
  if (!series) notFound();

  const seo = (series.seo as Record<string, string>) || {};
  const siteTitle = settings.seo_site_title || 'REDBEARD';
  const typeLabel = getContentTypeLabel((series as any).type);
  
  const title = seo.title || `${series.title} — Read ${typeLabel} Online | ${siteTitle}`;
  const description = getSeoDescription(series, seo, siteTitle, typeLabel);
  
  const keywords = seo.keywords 
    ? seo.keywords.split(',').map(k => k.trim()) 
    : [
        ...series.genres.map(g => g.name),
        ...series.tags.map(t => t.name),
        ...series.authors.map(a => a.name),
        series.title,
        `read ${typeLabel.toLowerCase()} hindi`
      ];

  const robots = seo.robots || { index: true, follow: true };
  const rawCanonical = seo.canonicalUrl || seo.canonical || `${APP_URL}/series/${slug}`;
  const canonical = rawCanonical
    .replace(/^http:\/\//, 'https://')
    .replace('https://www.redbeard.store', 'https://redbeard.store')
    .replace('https://redbeard-manhwa.vercel.app', 'https://redbeard.store')
    .replace(/\/+$/, '');
  const { ogImage, twitterImage } = resolveSocialImages({
    customOgImage: seo.ogImage || series.coverImage,
    customTwitterImage: seo.twitterImage,
    settings,
  });

  const isNSFW = (series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI';

  return {
    title: { absolute: title },
    description,
    keywords,
    robots,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: 'book',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [twitterImage],
    },
    alternates: {
      canonical: canonical,
    },
    ...(isNSFW && {
      other: {
        rating: 'adult',
      }
    })
  };
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  ONGOING: 'success',
  COMPLETED: 'info',
  HIATUS: 'warning',
  CANCELLED: 'danger',
  UPCOMING: 'primary',
};

import { SubscribeCard } from '@/components/shared/SubscribeCard';

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesData(slug);
  const settings = await getCachedSettings();
  
  if (!series) {
    notFound();
  }

  // Calculate rating distribution
  const ratingDistribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  series.reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    }
  });

  // User data is now fetched client-side in SeriesActionsClient

  // OPT-02: Use cached recommendation queries instead of raw Prisma calls
  const genreIds = series.genres.map((g: { id: string }) => g.id);
  const relatedSeriesRaw = await getCachedRelatedSeries(series.id, genreIds);
  const relatedSeries = relatedSeriesRaw.map(s => toSeriesCardData(s as any));

  const siteUrl = APP_URL || 'http://localhost:3000';
  const siteTitle = settings.seo_site_title || 'REDBEARD';
  
  const isLightNovel = series.type === 'LIGHT_NOVEL';
  const isAdult = (series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI';
  
  const seo = (series.seo as Record<string, string>) || {};
  const typeLabel = getContentTypeLabel((series as any).type);
  const jsonLdDescription = getSeoDescription(series, seo, siteTitle, typeLabel);
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': isLightNovel ? 'Book' : 'ComicSeries',
    name: series.title,
    description: jsonLdDescription,
    image: series.coverImage,
    url: `${siteUrl}/series/${slug}`,
    genre: [getContentTypeLabel(series.type as any), ...series.genres.map((g: { name: string }) => g.name)],
    author: series.authors.map((a: { name: string }) => ({
      '@type': 'Person',
      name: a.name,
    })),
    publisher: {
      '@type': 'Organization',
      name: 'REDBEARD'
    },
    ...(isAdult && { contentRating: 'adult' }),
    ...(series.ratingCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: series.averageRating,
        ratingCount: series.ratingCount,
        bestRating: 5,
        worstRating: 1,
      }
    })
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Browse',
        item: `${siteUrl}/browse/trending`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: series.title,
        item: `${siteUrl}/series/${slug}`,
      }
    ]
  };

  const firstChapter = series.chapters.length > 0 ? series.chapters[0] : null;
  const safeFirstSlug = firstChapter ? (typeof firstChapter.slug === 'string' && firstChapter.slug.trim() ? firstChapter.slug : firstChapter.number != null ? String(firstChapter.number) : null) : null;
  const firstChapterLink = firstChapter 
    ? (firstChapter.sourceType === 'DOWNLOAD' && firstChapter.downloadUrl ? `/api/chapter/${firstChapter.id}/download` : safeFirstSlug ? `/series/${series.slug}/chapter/${safeFirstSlug}` : '#') 
    : '#';

  const chaptersList = series.chapters.map((c: any) => ({
    id: c.id,
    number: c.number,
    label: c.label,
    slug: c.slug,
    sourceType: c.sourceType,
    downloadUrl: c.downloadUrl
  }));

  // Information card items: Type, Release year, Reading direction, Alternative names
  const infoCardItems = [
    { label: 'Type', value: typeLabel },
    { label: 'Release Year', value: series.releaseYear?.toString() || '' },
    { 
      label: 'Reading Direction', 
      value: series.readingDirection === 'VERTICAL' 
        ? 'Vertical' 
        : series.readingDirection === 'RTL' 
          ? 'Right to Left' 
          : series.readingDirection === 'LTR' 
            ? 'Left to Right' 
            : (series.readingDirection || '') 
    },
    { 
      label: 'Alternative Names', 
      value: series.alternativeTitles?.filter(Boolean).join(', ') || '' 
    },
  ].filter((item) => {
    const v = item.value.trim().toLowerCase();
    return v !== '' && v !== 'unknown' && v !== 'n/a' && v !== 'none';
  });

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      
      {/* ── Banner Section ────────────────────────────────── */}
      <section className="relative h-44 sm:h-52 md:h-72 lg:h-80 w-full overflow-hidden">
        <Image
          src={series.bannerImage || series.coverImage}
          alt=""
          fill
          className="object-cover scale-105 blur-lg opacity-35"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
      </section>

      {/* ── Main Content (overlapping banner) ─────────────── */}
      <div className="relative -mt-20 sm:-mt-24 md:-mt-36 z-10 mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] md:pb-16">
        <div className="w-full max-w-full overflow-hidden flex justify-center mb-3 sm:mb-5">
          <AdRenderer placement="series_detail" />
        </div>

        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 lg:gap-10">
          {/* ── Cover Image (Left column on desktop, side-by-side header on mobile) ── */}
          <div className="flex md:flex-col gap-3.5 sm:gap-4 md:w-60 lg:w-72 shrink-0 items-start">
            <div className="relative w-28 sm:w-36 md:w-full aspect-2/3 shrink-0 rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10">
              <Image
                src={series.coverImage}
                alt={series.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 288px"
              />
            </div>

            {/* Mobile Header: Info alongside cover to eliminate dead vertical space */}
            <div className="flex flex-col justify-end flex-1 min-w-0 md:hidden pt-0.5">
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <Badge variant={statusVariant[series.status]} size="sm" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                  {series.status}
                </Badge>
                {series.isHot && <Badge variant="danger" size="sm" className="text-[10px] px-2 py-0.5 font-bold">🔥 HOT</Badge>}
                <Badge variant="primary" size="sm" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                  {getContentTypeLabel(series.type as any)}
                </Badge>
                {((series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI') && (
                  <Badge variant="danger" size="sm" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                    🔞 NSFW
                  </Badge>
                )}
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-text-primary tracking-tight leading-snug line-clamp-2 sm:line-clamp-3 mb-1.5">
                {series.title}
              </h1>

              {/* Quick stats row on mobile */}
              <div className="flex items-center gap-2.5 text-xs text-text-muted mb-2 font-medium">
                {series.averageRating > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    ★ {series.averageRating.toFixed(1)}
                    <span className="text-text-muted font-normal text-[11px]">({series.ratingCount})</span>
                  </span>
                )}
                {series.totalViews > 0 && (
                  <span>{series.totalViews.toLocaleString()} views</span>
                )}
              </div>

              {/* Mobile Genre chips */}
              <div className="flex flex-wrap gap-1.5">
                {series.genres.slice(0, 3).map((genre: { slug: string, name: string }) => (
                  <Link
                    key={genre.slug}
                    href={`/browse/genres/${genre.slug}`}
                    prefetch={false}
                    className="rounded-md bg-card/80 border border-border/60 px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Desktop Right Column & Full details ─────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col justify-end">
            {/* Desktop Hero Header */}
            <div className="hidden md:flex flex-col">
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <Badge variant={statusVariant[series.status]} size="sm" className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider">
                  {series.status}
                </Badge>
                {series.isHot && <Badge variant="danger" size="sm" className="text-xs px-2.5 py-0.5 font-bold">🔥 HOT</Badge>}
                <Badge variant="primary" size="sm" className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider">
                  {getContentTypeLabel(series.type as any)}
                </Badge>
                {((series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI') && (
                  <Badge variant="danger" size="sm" className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider">
                    🔞 NSFW
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tight leading-tight mb-2.5">
                {series.title}
              </h1>

              {/* Desktop Rating, Views, and Chapter stats */}
              <div className="flex items-center gap-3.5 text-sm text-text-muted mb-4 font-medium">
                {series.averageRating > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold text-base">
                    ★ {series.averageRating.toFixed(1)}
                    <span className="text-xs text-text-muted font-normal">({series.ratingCount} reviews)</span>
                  </span>
                )}
                {series.totalViews > 0 && (
                  <span>{series.totalViews.toLocaleString()} views</span>
                )}
                {series.chapterCount > 0 && (
                  <span>{series.chapterCount} chapters</span>
                )}
              </div>

              {/* Desktop Genre Chips & Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {series.genres.map((genre: { slug: string, name: string }) => (
                  <Link
                    key={genre.slug}
                    href={`/browse/genres/${genre.slug}`}
                    prefetch={false}
                    className="rounded-lg bg-card/80 border border-border/60 px-3 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
                  >
                    {genre.name}
                  </Link>
                ))}
                {series.tags.slice(0, 4).map((tag: { slug: string, name: string }) => (
                  <span key={tag.slug} className="text-xs font-medium text-text-muted">
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Description (both mobile & desktop) */}
            <div className="mt-2 md:mt-0 mb-3 md:mb-5 max-w-3xl">
              <DescriptionClient description={series.synopsis || series.description} />
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex flex-wrap items-center gap-3 mt-1">
              <SeriesActionsClient
                seriesId={series.id}
                seriesSlug={series.slug}
                seriesTitle={series.title}
                coverImage={series.coverImage}
                firstChapterLink={firstChapterLink}
                chapters={chaptersList}
              />
            </div>
          </div>
        </div>

        {/* ── Information Card (Responsive 2-column grid) ──────────── */}
        {infoCardItems.length > 0 && (
          <div className="mt-4 mb-6 md:mt-8 md:mb-8">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-card/60 border border-border/60">
              {infoCardItems.map((item) => (
                <div 
                  key={item.label} 
                  className={cn(
                    "flex flex-col gap-0.5 min-w-0",
                    item.label === 'Alternative Names' && "col-span-2"
                  )}
                >
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span 
                    className="text-xs sm:text-sm font-semibold text-text-primary truncate" 
                    title={item.value}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Chapter List ──────────────────────────────────── */}
        <section className="mt-6 md:mt-10">
          <ChapterListSection
            chapters={series.chapters.map((c: any) => ({
              id: c.id,
              number: c.number,
              label: c.label || undefined,
              title: c.title || undefined,
              slug: c.slug,
              totalPages: c.totalPages,
              totalViews: c.totalViews,
              publishedAt: typeof c.publishedAt === 'string' ? c.publishedAt : c.publishedAt?.toISOString ? c.publishedAt.toISOString() : undefined,
              sourceType: c.sourceType || 'UPLOAD',
              downloadUrl: c.downloadUrl || undefined,
              downloadProvider: c.downloadProvider || undefined,
              isRead: false
            }))}
            seriesSlug={series.slug}
            seriesId={series.id}
            totalChapters={series.chapterCount}
            adSlotMiddle={<AdRenderer placement="series_detail" />}
          />
        </section>

        {/* ── Subscribe Card ──────────────────────────────────── */}
        <div className="mt-8 md:mt-12">
          <SubscribeCard youtubeUrl={settings.youtubeUrl || null} />
        </div>

        {/* ── Reviews ────────────────────────────────────────── */}
        <ReviewsSection 
          seriesId={series.id}
          averageRating={series.averageRating}
          ratingCount={series.ratingCount}
          initialReviews={series.reviews}
          ratingDistribution={ratingDistribution}
        />

        {/* ── Recommendations ────────────────────────────────── */}
        {relatedSeries.length > 0 && (
          <section className="mt-10 md:mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">Similar Series</h2>
              <Link href="/browse/trending" className="text-sm font-medium text-primary hover:underline">Browse All</Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {relatedSeries.map((item: SeriesCardData, index: number) => (
                <SeriesCard key={item.id} series={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Mobile Sticky Action Bar (positioned directly above MobileNav) ──────── */}
      <div 
        id="series-action-bar" 
        className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/70 px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-in-out [.mobile-menu-open_&]:translate-y-[200%]"
      >
        <div className="max-w-md mx-auto w-full">
          <SeriesActionsClient
            seriesId={series.id}
            seriesSlug={series.slug}
            seriesTitle={series.title}
            coverImage={series.coverImage}
            firstChapterLink={firstChapterLink}
            chapters={chaptersList}
            isMobile={true}
          />
        </div>
      </div>

      {/* SEO: Inject JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

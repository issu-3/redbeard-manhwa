export const revalidate = 3600;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

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
import { AdRenderer } from '@/components/ads/AdRenderer';

// OPT-21: Pre-render top 100 most popular series at build time
export async function generateStaticParams() {
  const series = await prisma.series.findMany({
    orderBy: { totalViews: 'desc' },
    take: 100,
    select: { slug: true }
  });
  return series.map((s) => ({
    slug: s.slug,
  }));
}

// OPT-04: React cache() deduplicates getSeriesData between generateMetadata and page component
const getSeriesData = cache(async (slug: string) => {
  // OPT-03: Use select instead of include to fetch only needed columns for chapters
  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      genres: true,
      tags: true,
      authors: true,
      artists: true,
      chapters: {
        where: { isPublished: true },
        orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
        take: 100,
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
  return series;
});

// OPT-02: Cache recommendation queries — these change infrequently
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
  ['series-related'],
  { tags: ['series'], revalidate: 600 }
);

const getCachedTrendingSeries = unstable_cache(
  async (excludeId: string) => {
    return prisma.series.findMany({
      where: { id: { not: excludeId } },
      orderBy: { totalViews: 'desc' },
      take: 6,
      select: SERIES_CARD_SELECT
    });
  },
  ['series-trending-sidebar'],
  { tags: ['series'], revalidate: 600 }
);

const getCachedRecentSeries = unstable_cache(
  async (excludeId: string) => {
    return prisma.series.findMany({
      where: { id: { not: excludeId } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: SERIES_CARD_SELECT
    });
  },
  ['series-recent-sidebar'],
  { tags: ['series'], revalidate: 600 }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesData(slug);
  const settings = await getCachedSettings();
  
  if (!series) return { title: 'Series Not Found' };

  const seo = (series.seo as Record<string, string>) || {};
  const siteTitle = settings.seo_site_title || 'REDBEARD';
  
  const title = seo.title || `${series.title} ${getContentTypeLabel((series as any).type)} - Download | ${siteTitle}`;
  const description = seo.description || series.synopsis || series.description.slice(0, 160);
  
  const keywords = seo.keywords 
    ? seo.keywords.split(',').map(k => k.trim()) 
    : [
        ...series.genres.map(g => g.name),
        ...series.tags.map(t => t.name),
        ...series.authors.map(a => a.name),
        series.title,
        `download ${getContentTypeLabel((series as any).type).toLowerCase()}`
      ];

  const robots = seo.robots || 'index, follow';
  const canonical = seo.canonicalUrl || `${APP_URL}/series/${slug}`;
  const ogImage = seo.ogImage || series.coverImage;
  const twitterImage = seo.twitterImage || series.coverImage;

  const isNSFW = (series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI';

  return {
    title,
    description,
    keywords,
    robots,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 800, height: 1200, alt: title }],
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
  const [relatedSeriesRaw, trendingSeriesRaw, recentSeriesRaw] = await Promise.all([
    getCachedRelatedSeries(series.id, genreIds),
    getCachedTrendingSeries(series.id),
    getCachedRecentSeries(series.id),
  ]);
  const relatedSeries = relatedSeriesRaw.map(s => toSeriesCardData(s as any));
  const trendingSeries = trendingSeriesRaw.map(s => toSeriesCardData(s as any));
  const recentSeries = recentSeriesRaw.map(s => toSeriesCardData(s as any));

  const siteUrl = APP_URL || 'http://localhost:3000';
  
  const isLightNovel = series.type === 'LIGHT_NOVEL';
  const isAdult = (series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': isLightNovel ? 'Book' : 'ComicSeries',
    name: series.title,
    description: series.synopsis || series.description,
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
  const firstChapterLink = firstChapter 
    ? (firstChapter.sourceType === 'DOWNLOAD' && firstChapter.downloadUrl ? `/api/chapter/${firstChapter.id}/download` : `/series/${series.slug}/chapter/${firstChapter.slug || firstChapter.number || 1}`) 
    : '#';

  const chaptersList = series.chapters.map((c: any) => ({
    id: c.id,
    number: c.number,
    label: c.label,
    slug: c.slug,
    sourceType: c.sourceType,
    downloadUrl: c.downloadUrl
  }));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      
      {/* ── Banner Section ────────────────────────────────── */}
      <section className="relative h-[45vh] min-h-[400px] w-full overflow-hidden">
        <Image
          src={series.bannerImage || series.coverImage}
          alt=""
          fill
          className="object-cover scale-110 blur-xl opacity-40"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
      </section>

      {/* ── Main Content (overlapping banner) ─────────────── */}
      <div className="relative -mt-64 z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex justify-center overflow-hidden w-full">
          <AdRenderer placement="series_detail" />
        </div>
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mt-8">
          {/* ── Cover Image ─────────────────────────────── */}
          <div className="shrink-0 flex flex-col items-center md:items-start md:w-[280px] lg:w-[320px]">
            <div className="relative w-[220px] md:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-border/50">
              <Image
                src={series.coverImage}
                alt={series.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 220px, 320px"
              />
            </div>
          </div>

          {/* ── Series Hero Info ──────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col justify-end pt-4 md:pt-16">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={statusVariant[series.status]} size="sm" className="font-bold uppercase tracking-wider">
                {series.status}
              </Badge>
              {series.isHot && <Badge variant="danger" size="sm">🔥 HOT</Badge>}
              <Badge variant="primary" size="sm" className="font-bold uppercase tracking-wider">
                {getContentTypeLabel(series.type as any)}
              </Badge>
              {((series as any).isNSFW || series.type === 'PORNHWA' || series.type === 'DOUJINSHI') && (
                <Badge variant="danger" size="sm" className="font-bold uppercase tracking-wider">
                  🔞 NSFW
                </Badge>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-text-primary tracking-tight leading-tight mb-4">
              {series.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {series.genres.slice(0, 4).map((genre: { slug: string, name: string }) => (
                <Link
                  key={genre.slug}
                  href={`/browse?genre=${genre.slug}`}
                  className="rounded-md bg-card/60 backdrop-blur-md px-3 py-1 text-sm font-medium text-text-primary border border-border/50 hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  {genre.name}
                </Link>
              ))}
              {series.tags.slice(0, 3).map((tag: { slug: string, name: string }) => (
                <span key={tag.slug} className="text-sm font-medium text-text-muted">
                  #{tag.name}
                </span>
              ))}
            </div>

            <div className="mb-8 max-w-3xl">
              <DescriptionClient description={series.synopsis || series.description} />
            </div>

            {/* Action Buttons (Desktop) */}
            <div className="hidden md:flex flex-wrap gap-4">
              <SeriesActionsClient
                seriesId={series.id}
                seriesSlug={series.slug}
                firstChapterLink={firstChapterLink}
                chapters={chaptersList}
              />
            </div>
          </div>
        </div>

        {/* ── Metadata Grid ──────────────────────────────────── */}
        <div className="mt-12 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6 rounded-2xl bg-card border border-border">
            <MetaItem label="Type" value={series.type} />
            <MetaItem label="Release Year" value={series.releaseYear?.toString() || 'N/A'} />
            <MetaItem label="Author" value={series.authors.map((a: { name: string }) => a.name).join(', ') || 'Unknown'} />
            <MetaItem label="Artist" value={series.artists.map((a: { name: string }) => a.name).join(', ') || 'Unknown'} />
            <MetaItem label="Direction" value={series.readingDirection === 'VERTICAL' ? 'Vertical' : series.readingDirection} />
            <MetaItem label="Alt Names" value={series.alternativeTitles[0] || 'None'} />
          </div>
        </div>

        {/* ── Chapter List ──────────────────────────────────── */}
        <section className="mt-12">
          <ChapterListSection
            chapters={series.chapters.map((c: any) => ({
              id: c.id,
              number: c.number,
              label: c.label || undefined,
              title: c.title || undefined,
              slug: c.slug,
              totalPages: c.totalPages,
              totalViews: c.totalViews,
              publishedAt: c.publishedAt?.toISOString(),
              sourceType: c.sourceType || 'UPLOAD',
              downloadUrl: c.downloadUrl || undefined,
              downloadProvider: c.downloadProvider || undefined,
              isRead: false
            }))}
            seriesSlug={series.slug}
            seriesId={series.id}
            totalChapters={series.chapterCount}
          />
        </section>

        {/* ── Subscribe Card ──────────────────────────────────── */}
        <div className="mt-12">
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
        <section className="mt-20 space-y-16">
          {relatedSeries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Similar Series</h2>
                <Link href="/browse" className="text-sm font-medium text-primary hover:underline">Browse All</Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {relatedSeries.map((item: SeriesCardData, index: number) => (
                  <SeriesCard key={item.id} series={item} index={index} />
                ))}
              </div>
            </div>
          )}

          {trendingSeries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Trending This Week</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {trendingSeries.map((item: SeriesCardData, index: number) => (
                  <SeriesCard key={item.id} series={item} index={index} />
                ))}
              </div>
            </div>
          )}

          {recentSeries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Recently Updated</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {recentSeries.map((item: SeriesCardData, index: number) => (
                  <SeriesCard key={item.id} series={item} index={index} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Mobile Sticky Action Bar (positioned above MobileNav) ──────── */}
      <div className="md:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex gap-3 max-w-7xl mx-auto">
          <SeriesActionsClient
            seriesId={series.id}
            seriesSlug={series.slug}
            firstChapterLink={firstChapterLink}
            chapters={chaptersList}
            isMobile={true}
          />
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BookOpen,
  Share2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ChapterListSection } from './chapter-list';
import { prisma } from '@/lib/prisma';
import type { SeriesCardData } from '@/types';
import type { Series, Genre, Chapter } from '@prisma/client';
import { auth } from '@/auth';
import { DescriptionClient } from './description-client';
import { ReviewsSection } from '@/components/series/ReviewsSection';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { AdSlot } from '@/components/ads/AdSlot';

async function getSeriesData(slug: string) {
  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      genres: true,
      tags: true,
      authors: true,
      artists: true,
      chapters: {
        orderBy: { number: 'desc' },
      },
      reviews: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }
    },
  });
  return series;
}

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
  
  const title = seo.title || `${series.title} Manhwa - Read Online | ${siteTitle}`;
  const description = seo.description || series.synopsis || series.description.slice(0, 160);
  
  const keywords = seo.keywords 
    ? seo.keywords.split(',').map(k => k.trim()) 
    : [
        ...series.genres.map(g => g.name),
        ...series.tags.map(t => t.name),
        ...series.authors.map(a => a.name),
        series.title,
        'read manhwa online'
      ];

  const robots = seo.robots || 'index, follow';
  const canonical = seo.canonicalUrl || `${APP_URL}/series/${slug}`;
  const ogImage = seo.ogImage || series.coverImage;
  const twitterImage = seo.twitterImage || series.coverImage;

  return {
    title,
    description,
    keywords,
    robots,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 800, height: 1200 }],
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
    }
  };
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  ONGOING: 'success',
  COMPLETED: 'info',
  HIATUS: 'warning',
  CANCELLED: 'danger',
  UPCOMING: 'primary',
};

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesData(slug);
  
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

  const session = await auth();
  let isBookmarked = false;
  let continueReadingChapter: number | null = null;
  
  if (session?.user?.id) {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_seriesId: {
          userId: session.user.id,
          seriesId: series.id
        }
      }
    });
    isBookmarked = !!bookmark;

    const history = await prisma.readingHistory.findFirst({
      where: {
        userId: session.user.id,
        seriesId: series.id,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        chapter: true
      }
    });
    
    if (history?.chapter) {
      continueReadingChapter = history.chapter.number;
    }
  }

  const relatedSeries = await prisma.series.findMany({
    where: { 
      id: { not: series.id },
      genres: { some: { id: { in: series.genres.map((g: { id: string }) => g.id) } } }
    },
    take: 6,
    include: { genres: true }
  });

  const trendingSeries = await prisma.series.findMany({
    where: { id: { not: series.id } },
    orderBy: { totalViews: 'desc' },
    take: 6,
    include: { genres: true }
  });

  const recentSeries = await prisma.series.findMany({
    where: { id: { not: series.id } },
    orderBy: { updatedAt: 'desc' },
    take: 6,
    include: { genres: true }
  });

  const siteUrl = APP_URL || 'http://localhost:3000';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ComicSeries',
    name: series.title,
    description: series.synopsis || series.description,
    image: series.coverImage,
    url: `${siteUrl}/series/${slug}`,
    genre: series.genres.map((g: { name: string }) => g.name),
    author: series.authors.map((a: { name: string }) => ({
      '@type': 'Person',
      name: a.name,
    })),
    publisher: {
      '@type': 'Organization',
      name: 'REDBEARD'
    }
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
        item: `${siteUrl}/browse`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: series.title,
        item: `${siteUrl}/series/${slug}`,
      }
    ]
  };

  const firstChapter = series.chapters.length > 0 ? series.chapters[series.chapters.length - 1] : null;
  const firstChapterLink = firstChapter 
    ? (firstChapter.sourceType === 'EXTERNAL' && firstChapter.externalUrl ? firstChapter.externalUrl : `/series/${series.slug}/chapter/${firstChapter.number}`) 
    : '#';

  const continueChapterObj = continueReadingChapter 
    ? series.chapters.find((c: Chapter) => c.number === continueReadingChapter)
    : null;

  const continueLink = continueChapterObj
    ? (continueChapterObj.sourceType === 'EXTERNAL' && continueChapterObj.externalUrl ? continueChapterObj.externalUrl : `/series/${series.slug}/chapter/${continueChapterObj.number}`)
    : firstChapterLink;

  const hasHistory = !!continueChapterObj;

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
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
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
              {firstChapter && (
                <Link
                  href={hasHistory ? continueLink : firstChapterLink}
                  target={firstChapter.sourceType === 'EXTERNAL' ? '_blank' : undefined}
                  rel={firstChapter.sourceType === 'EXTERNAL' ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-2 rounded-xl bg-primary px-10 py-4 font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25"
                >
                  <BookOpen className="h-5 w-5" />
                  {hasHistory ? `Continue Ch. ${continueReadingChapter}` : 'Read First Chapter'}
                </Link>
              )}
              
              <BookmarkButton seriesId={series.id} initialBookmarked={isBookmarked} />
              
              <button className="flex items-center justify-center rounded-xl border-2 border-border bg-card/50 backdrop-blur-sm w-[56px] text-text-primary transition-all hover:border-primary/50 hover:bg-card-hover hover:text-primary">
                <Share2 className="h-5 w-5" />
              </button>
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

        {/* ── Ad Slot ──────────────────────────────────────── */}
        <div className="my-8 w-full">
          <AdSlot placement="sidebar" />
        </div>

        {/* ── Chapter List ──────────────────────────────────── */}
        <section className="mt-12">
          <ChapterListSection
            chapters={series.chapters.map((c: Chapter) => ({
              id: c.id,
              number: c.number,
              title: c.title || undefined,
              slug: c.slug,
              totalPages: c.totalPages,
              totalViews: c.totalViews,
              publishedAt: c.publishedAt?.toISOString(),
              sourceType: c.sourceType || 'UPLOAD',
              externalUrl: c.externalUrl || undefined,
              externalProvider: c.externalProvider || undefined,
              isRead: false
            }))}
            seriesSlug={series.slug}
          />
        </section>

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
                {relatedSeries.map((item: Series & { genres: Genre[] }, index: number) => (
                  <SeriesCard key={item.id} series={{...item, type: item.type as SeriesCardData['type'], status: item.status as SeriesCardData['status'], updatedAt: item.updatedAt.toISOString(), genres: item.genres, latestChapterNumber: item.chapterCount}} index={index} />
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
                {trendingSeries.map((item: Series & { genres: Genre[] }, index: number) => (
                  <SeriesCard key={item.id} series={{...item, type: item.type as SeriesCardData['type'], status: item.status as SeriesCardData['status'], updatedAt: item.updatedAt.toISOString(), genres: item.genres, latestChapterNumber: item.chapterCount}} index={index} />
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
                {recentSeries.map((item: Series & { genres: Genre[] }, index: number) => (
                  <SeriesCard key={item.id} series={{...item, type: item.type as SeriesCardData['type'], status: item.status as SeriesCardData['status'], updatedAt: item.updatedAt.toISOString(), genres: item.genres, latestChapterNumber: item.chapterCount}} index={index} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Mobile Sticky Action Bar ──────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex gap-3 max-w-7xl mx-auto">
          {firstChapter && (
            <Link
              href={hasHistory ? continueLink : firstChapterLink}
              target={firstChapter.sourceType === 'EXTERNAL' ? '_blank' : undefined}
              rel={firstChapter.sourceType === 'EXTERNAL' ? 'noopener noreferrer' : undefined}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-bold text-white active:scale-95 transition-transform shadow-lg shadow-primary/25"
            >
              <BookOpen className="h-5 w-5" />
              {hasHistory ? `Continue Ch. ${continueReadingChapter}` : 'Read First Chapter'}
            </Link>
          )}
          <BookmarkButton seriesId={series.id} initialBookmarked={isBookmarked} />
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

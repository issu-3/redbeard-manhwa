import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Eye,
  BookOpen,
  Bookmark,
  Share2,
  Clock,
  User,
  Palette,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { RatingStars } from '@/components/shared/RatingStars';
import { Badge } from '@/components/shared/Badge';
import { SeriesCard } from '@/components/shared/SeriesCard';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { ChapterListSection } from './chapter-list';
import { prisma } from '@/lib/prisma';
import type { SeriesCardData } from '@/types';
import type { Series, Genre, Chapter } from '@prisma/client';
import { auth } from '@/auth';
import { DescriptionClient } from './description-client';

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
    },
  });

  if (!series) return null;

  return series;
}

// ─── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesData(slug);
  
  if (!series) return { title: 'Series Not Found' };

  return {
    title: series.title,
    description: series.synopsis || series.description.slice(0, 160),
    openGraph: {
      title: `${series.title} | REDBEARD`,
      description: series.synopsis || series.description.slice(0, 160),
      images: [{ url: series.coverImage, width: 400, height: 600 }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: series.title,
      description: series.synopsis || series.description.slice(0, 160),
      images: [series.coverImage],
    },
  };
}

// ─── Status Config ─────────────────────────────────────────────

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  ONGOING: 'success',
  COMPLETED: 'info',
  HIATUS: 'warning',
  CANCELLED: 'danger',
  UPCOMING: 'primary',
};

// ─── Page Component ────────────────────────────────────────────

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

  // Check if user has bookmarked this series
  const session = await auth();
  let isBookmarked = false;
  
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
  }

  // Related series (mocked for now, but fetching real ones from same genres would be better)
  const relatedSeries = await prisma.series.findMany({
    where: { 
      id: { not: series.id },
      genres: { some: { id: { in: series.genres.map((g: { id: string }) => g.id) } } }
    },
    take: 6,
    include: { genres: true }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ── Banner Section ────────────────────────────────── */}
      <section className="relative h-[40vh] min-h-[320px] w-full overflow-hidden">
        {/* Blurred background image */}
        <Image
          src={series.bannerImage || series.coverImage}
          alt=""
          fill
          className="object-cover scale-110 blur-sm"
          priority
          sizes="100vw"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />

        {/* Red accent glow at top */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/8 rounded-full blur-[120px]" />
      </section>

      {/* ── Main Content (overlapping banner) ─────────────── */}
      <div className="relative -mt-40 z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Cover Image ─────────────────────────────── */}
          <div className="shrink-0 flex flex-col items-center lg:items-start">
            <div className="relative w-[200px] sm:w-[220px] lg:w-[260px] aspect-[2/3] rounded-2xl overflow-hidden border-2 border-border shadow-2xl shadow-black/50 group">
              <Image
                src={series.coverImage}
                alt={series.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
                sizes="260px"
              />
              {/* Glow effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
            </div>

            {/* ── Action Buttons (below cover on mobile, hidden on lg) ── */}
            <div className="flex flex-col gap-3 w-full mt-6 lg:hidden">
              {series.chapters.length > 0 && (
                <Link
                  href={`/series/${series.slug}/chapter/${series.chapters[series.chapters.length - 1].number}`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-6 py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
                >
                  <BookOpen className="h-5 w-5" />
                  Read First Chapter
                </Link>
              )}
              <div className="flex gap-3">
                <BookmarkButton seriesId={series.id} initialBookmarked={isBookmarked} bookmarkCount={series.totalBookmarks} />
                <button className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-medium text-text-primary transition-all hover:border-primary/40 hover:bg-card-hover">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Series Info ──────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Title & Alt titles */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Badge variant={statusVariant[series.status]} size="md">
                  {series.status}
                </Badge>
                <Badge variant="primary" size="md">
                  {series.type}
                </Badge>
                {series.isHot && (
                  <Badge variant="danger" size="md">
                    🔥 HOT
                  </Badge>
                )}
                {series.isEditorChoice && (
                  <Badge variant="warning" size="md">
                    ⭐ Editor&apos;s Choice
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
                {series.title}
              </h1>
              {series.alternativeTitles.length > 0 && (
                <p className="mt-2 text-sm text-text-muted leading-relaxed">
                  {series.alternativeTitles.join(' • ')}
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-5">
              <RatingStars rating={series.averageRating} size="lg" />
              <span className="text-xl font-bold text-amber-400">
                {series.averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-text-muted">
                ({formatNumber(series.ratingCount)} ratings)
              </span>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 sm:gap-6 mb-6">
              <StatItem
                icon={<Eye className="h-4 w-4" />}
                label="Views"
                value={formatNumber(series.totalViews)}
              />
              <StatItem
                icon={<Bookmark className="h-4 w-4" />}
                label="Bookmarks"
                value={formatNumber(series.totalBookmarks)}
              />
              <StatItem
                icon={<BookOpen className="h-4 w-4" />}
                label="Chapters"
                value={series.chapterCount.toString()}
              />
              <StatItem
                icon={<Clock className="h-4 w-4" />}
                label="Updated"
                value={formatRelativeTime(series.updatedAt.toISOString())}
              />
            </div>

            {/* Description */}
            <DescriptionSection description={series.description} />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 rounded-2xl bg-surface/60 border border-border/50">
              <MetaItem label="Type" value={series.type} />
              <MetaItem label="Status" value={series.status} />
              <MetaItem label="Released" value={series.releaseYear?.toString() || 'N/A'} />
              <MetaItem label="Direction" value={series.readingDirection === 'VERTICAL' ? 'Vertical' : series.readingDirection} />
            </div>

            {/* Genres */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Genres
              </h3>
              <div className="flex flex-wrap gap-2">
                {series.genres.map((genre: { slug: string, name: string }) => (
                  <Link
                    key={genre.slug}
                    href={`/browse?genre=${genre.slug}`}
                    className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-text-secondary border border-border transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {series.tags.map((tag: { slug: string, name: string }) => (
                  <Link
                    key={tag.slug}
                    href={`/browse?tag=${tag.slug}`}
                    className="rounded-full bg-card/50 px-2.5 py-1 text-xs text-text-muted border border-border/50 transition-all hover:text-text-secondary hover:border-border"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Authors & Artists */}
            <div className="flex flex-wrap gap-6 mb-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5 flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Authors
                </h3>
                <div className="flex flex-wrap gap-2">
                  {series.authors.map((author: { slug: string, name: string }) => (
                    <Link
                      key={author.slug}
                      href={`/author/${author.slug}`}
                      className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
                    >
                      {author.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5 flex items-center gap-1.5">
                  <Palette className="h-3 w-3" />
                  Artists
                </h3>
                <div className="flex flex-wrap gap-2">
                  {series.artists.map((artist: { slug: string, name: string }) => (
                    <Link
                      key={artist.slug}
                      href={`/artist/${artist.slug}`}
                      className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
                    >
                      {artist.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons (desktop) */}
            <div className="hidden lg:flex gap-3 mb-8">
              {series.chapters.length > 0 && (
                <Link
                  href={`/series/${series.slug}/chapter/${series.chapters[series.chapters.length - 1].number}`}
                  className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
                >
                  <BookOpen className="h-5 w-5" />
                  Read First Chapter
                </Link>
              )}
              {series.chapters.length > 1 && (
                <Link
                  href={`/series/${series.slug}/chapter/${series.chapters[0].number}`}
                  className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 py-3.5 font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98]"
                >
                  Continue Ch. {series.chapters[0].number}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              
              <BookmarkButton seriesId={series.id} initialBookmarked={isBookmarked} />
              
              <button className="flex items-center justify-center rounded-xl border border-border bg-card w-[52px] text-text-primary transition-all hover:border-primary/40 hover:bg-card-hover">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Chapter List ──────────────────────────────────── */}
        <section className="mt-12">
          {/* Note: In a real app we'd map our DB Chapter model to ChapterListItem type */}
          <ChapterListSection
            chapters={series.chapters.map((c: Chapter) => ({
              id: c.id,
              number: c.number,
              title: c.title || undefined,
              slug: c.slug,
              totalPages: c.totalPages,
              totalViews: c.totalViews,
              publishedAt: c.publishedAt?.toISOString(),
              isRead: false // Real app would map ReadingHistory here
            }))}
            seriesSlug={series.slug}
          />
        </section>

        {/* ── Related Series ────────────────────────────────── */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text-primary">
              You May Also Like
            </h2>
            <Link
              href="/browse"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Browse All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {relatedSeries.map((item: Series & { genres: Genre[] }, index: number) => (
              <SeriesCard 
                key={item.id} 
                series={{...item, type: item.type as SeriesCardData['type'], status: item.status as SeriesCardData['status'], updatedAt: item.updatedAt.toISOString(), genres: item.genres, latestChapterNumber: item.chapterCount}} 
                index={index} 
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-border text-text-muted">
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-semibold text-text-primary" suppressHydrationWarning>{value}</p>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function DescriptionSection({ description }: { description: string }) {
  // We'll inline a client-side expandable via the chapter-list file
  // For the server render, show truncated
  return <DescriptionClient description={description} />;
}

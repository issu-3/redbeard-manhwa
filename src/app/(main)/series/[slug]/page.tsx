import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
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
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import type { SeriesDetail, SeriesCardData, ChapterListItem } from '@/types';
import { ChapterListSection } from './chapter-list';

// ─── Sample Data ───────────────────────────────────────────────

function getSampleSeries(): SeriesDetail {
  const chapters: ChapterListItem[] = Array.from({ length: 20 }, (_, i) => {
    const num = 20 - i;
    const daysAgo = i * 7;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      id: `ch-${num}`,
      number: num,
      title:
        num === 20
          ? 'The Gates of Ragnarok'
          : num === 19
            ? 'Awakening of the Shadow'
            : num === 18
              ? 'The Monarch Returns'
              : num === 17
                ? 'Into the Abyss'
                : num === 16
                  ? 'The Final Warning'
                  : num === 15
                    ? 'Between Worlds'
                    : num === 14
                      ? 'Rise of the Rulers'
                      : num === 13
                        ? 'Shadows Converge'
                        : num === 12
                          ? 'The Architect\'s Design'
                          : num === 11
                            ? 'Through Fire and Ice'
                            : num === 10
                              ? 'The Tournament Begins'
                              : num === 9
                                ? 'Bonds of Power'
                                : num === 8
                                  ? 'A New Threat Emerges'
                                  : num === 7
                                    ? 'Legacy of the Monarchs'
                                    : num === 6
                                      ? 'The Hidden Dungeon'
                                      : num === 5
                                        ? 'First Awakening'
                                        : num === 4
                                          ? 'Shadows of Seoul'
                                          : num === 3
                                            ? 'The System Activates'
                                            : num === 2
                                              ? 'Inherited Power'
                                              : 'A New Beginning',
      slug: `chapter-${num}`,
      totalPages: 18 + Math.floor(Math.random() * 15),
      totalViews: Math.floor(50000 + Math.random() * 450000),
      publishedAt: date.toISOString(),
      isRead: num <= 5,
    };
  });

  return {
    id: 'series-solo-ragnarok',
    title: 'Solo Leveling: Ragnarok',
    slug: 'solo-leveling-ragnarok',
    alternativeTitles: [
      '나 혼자만 레벨업: 라그나로크',
      'Solo Leveling: Ragnarök',
      'Ore dake Level Up na Ken: Ragnarok',
    ],
    description: `Following the aftermath of the war between the Monarchs and the Rulers, Sung Suho — the son of the legendary Shadow Monarch, Sung Jinwoo — lives an ordinary life, unaware of the extraordinary battles his father once fought. However, when mysterious gates begin to reappear across the globe, threatening a new era of chaos, Suho is drawn into a world of hunters, dungeons, and shadows.

Armed with a fraction of his father's immense power and guided by an enigmatic system, Suho must rise to confront an ancient threat that dwarfs anything the original hunters ever faced. Ragnarok — the twilight of the gods — is approaching, and only the son of the Shadow Monarch stands between humanity and total annihilation.

As Suho battles increasingly powerful monsters and uncovers the truth behind the new gates, he must decide: will he follow in his father's footsteps, or forge his own path as the next Shadow Monarch? The answer may determine the fate of every world in existence.`,
    synopsis:
      'The son of the Shadow Monarch must rise as new gates threaten the world in this epic continuation of the Solo Leveling saga.',
    coverImage: 'https://picsum.photos/seed/solo-ragnarok-cover/400/600',
    bannerImage: 'https://picsum.photos/seed/solo-ragnarok-banner/1920/800',
    type: 'MANHWA',
    status: 'ONGOING',
    readingDirection: 'VERTICAL',
    releaseYear: 2024,
    averageRating: 8.7,
    ratingCount: 24853,
    totalViews: 12_500_000,
    totalBookmarks: 385_000,
    chapterCount: 20,
    latestChapterNumber: 20,
    isHot: true,
    isFeatured: true,
    isEditorChoice: true,
    isHiddenGem: false,
    genres: [
      { name: 'Action', slug: 'action' },
      { name: 'Fantasy', slug: 'fantasy' },
      { name: 'Adventure', slug: 'adventure' },
      { name: 'Supernatural', slug: 'supernatural' },
      { name: 'Drama', slug: 'drama' },
    ],
    tags: [
      { name: 'Overpowered MC', slug: 'overpowered-mc' },
      { name: 'Dungeons', slug: 'dungeons' },
      { name: 'Monsters', slug: 'monsters' },
      { name: 'System', slug: 'system' },
      { name: 'Leveling', slug: 'leveling' },
      { name: 'Hunters', slug: 'hunters' },
      { name: 'Sequel', slug: 'sequel' },
      { name: 'Shadow Powers', slug: 'shadow-powers' },
    ],
    authors: [
      { name: 'Chugong', slug: 'chugong' },
      { name: 'Gi So-Ryeong', slug: 'gi-so-ryeong' },
    ],
    artists: [
      { name: 'REDICE Studio', slug: 'redice-studio' },
      { name: 'A-1 Pictures', slug: 'a1-pictures' },
    ],
    chapters,
    updatedAt: new Date().toISOString(),
    createdAt: '2024-01-15T00:00:00Z',
  };
}

function getRelatedSeries(): SeriesCardData[] {
  const titles = [
    { t: 'Solo Leveling', s: 'solo-leveling' },
    { t: 'Omniscient Reader\'s Viewpoint', s: 'omniscient-readers-viewpoint' },
    { t: 'The Beginning After the End', s: 'the-beginning-after-the-end' },
    { t: 'Tomb Raider King', s: 'tomb-raider-king' },
    { t: 'Return of the Blossoming Blade', s: 'return-blossoming-blade' },
    { t: 'Second Life Ranker', s: 'second-life-ranker' },
  ];
  return titles.map((item, i) => ({
    id: `related-${i}`,
    title: item.t,
    slug: item.s,
    coverImage: `https://picsum.photos/seed/${item.s}/400/600`,
    type: 'MANHWA' as const,
    status: i % 3 === 0 ? ('COMPLETED' as const) : ('ONGOING' as const),
    averageRating: 7.5 + Math.random() * 2.5,
    totalViews: Math.floor(1_000_000 + Math.random() * 20_000_000),
    totalBookmarks: Math.floor(50_000 + Math.random() * 500_000),
    chapterCount: 50 + Math.floor(Math.random() * 200),
    latestChapterNumber: 50 + Math.floor(Math.random() * 200),
    genres: [
      { name: 'Action', slug: 'action' },
      { name: 'Fantasy', slug: 'fantasy' },
    ],
    updatedAt: new Date().toISOString(),
  }));
}

// ─── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  await params;
  const series = getSampleSeries();

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
  await params;
  const series = getSampleSeries();
  const relatedSeries = getRelatedSeries();

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
              <Link
                href={`/series/${series.slug}/chapter/1`}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-6 py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
              >
                <BookOpen className="h-5 w-5" />
                Read First Chapter
              </Link>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-medium text-text-primary transition-all hover:border-primary/40 hover:bg-card-hover">
                  <Bookmark className="h-4 w-4" />
                  Bookmark
                </button>
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
                value={formatRelativeTime(series.updatedAt)}
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
                {series.genres.map((genre) => (
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
                {series.tags.map((tag) => (
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
                  {series.authors.map((author) => (
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
                  {series.artists.map((artist) => (
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
              <Link
                href={`/series/${series.slug}/chapter/1`}
                className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-semibold text-white transition-all hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
              >
                <BookOpen className="h-5 w-5" />
                Read First Chapter
              </Link>
              {series.latestChapterNumber && series.latestChapterNumber > 1 && (
                <Link
                  href={`/series/${series.slug}/chapter/${series.latestChapterNumber}`}
                  className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 py-3.5 font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98]"
                >
                  Continue Ch. {series.latestChapterNumber}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 font-medium text-text-primary transition-all hover:border-primary/40 hover:bg-card-hover">
                <Bookmark className="h-4 w-4" />
                Bookmark
              </button>
              <button className="flex items-center justify-center rounded-xl border border-border bg-card w-[52px] text-text-primary transition-all hover:border-primary/40 hover:bg-card-hover">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Chapter List ──────────────────────────────────── */}
        <section className="mt-12">
          <ChapterListSection
            chapters={series.chapters}
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
            {relatedSeries.map((item, index) => (
              <SeriesCard key={item.id} series={item} index={index} />
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
        <p className="text-sm font-semibold text-text-primary">{value}</p>
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

// Client component for expandable description — inlined here then imported
import { DescriptionClient } from './description-client';

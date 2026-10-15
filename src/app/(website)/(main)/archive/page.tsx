export const revalidate = 21600; // 6 hours

import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { APP_URL, APP_NAME } from '@/lib/constants';
import { generateMetadata as generateSeoMetadata } from '@/lib/seo';
import { ArchiveChapterList } from './archive-client';

export async function generateMetadata(): Promise<Metadata> {
  const seo = generateSeoMetadata({
    title: 'Series Directory & Archive',
    description: `Browse the complete directory of all series and chapters available on ${APP_NAME}. Find manhwa, manga, manhua, and webtoons organized alphabetically.`,
    url: `${APP_URL}/archive`,
  });

  return {
    ...seo,
    alternates: {
      canonical: `${APP_URL}/archive`,
    },
  };
}

interface SeriesWithChapters {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  coverImage: string;
  chapterCount: number;
  chapters: {
    slug: string;
    number: number | null;
    title: string | null;
    publishedAt: Date | null;
  }[];
  genres: { name: string; slug: string }[];
}

async function getArchiveData(): Promise<{
  series: SeriesWithChapters[];
  totalSeries: number;
  totalChapters: number;
}> {
  const series = await prisma.series.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      type: true,
      coverImage: true,
      chapterCount: true,
      chapters: {
        where: {
          isPublished: true,
          NOT: {
            sourceType: 'DOWNLOAD',
          },
        },
        select: {
          slug: true,
          number: true,
          title: true,
          publishedAt: true,
        },
        orderBy: { number: 'asc' },
      },
      genres: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { title: 'asc' },
  });

  const totalChapters = series.reduce((sum, s) => sum + s.chapters.length, 0);

  return {
    series: series as SeriesWithChapters[],
    totalSeries: series.length,
    totalChapters,
  };
}

export default async function ArchivePage() {
  const { series, totalSeries, totalChapters } = await getArchiveData();
  const baseUrl = APP_URL || 'https://redbeard.store';

  // Group series by first letter for alphabetical navigation
  const grouped = new Map<string, SeriesWithChapters[]>();
  for (const s of series) {
    const firstChar = s.title.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  // CollectionPage structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${APP_NAME} — Complete Series Directory`,
    description: `Browse all ${totalSeries} series and ${totalChapters} chapters on ${APP_NAME}.`,
    url: `${baseUrl}/archive`,
    isPartOf: {
      '@type': 'WebSite',
      url: baseUrl,
      name: APP_NAME,
    },
    numberOfItems: totalSeries,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 lg:px-16">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            Series Directory
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Complete archive of all{' '}
            <strong className="text-text-secondary">{totalSeries.toLocaleString()}</strong>{' '}
            series and{' '}
            <strong className="text-text-secondary">{totalChapters.toLocaleString()}</strong>{' '}
            chapters available on {APP_NAME}.
          </p>
        </header>

        {/* Alphabetical Quick Nav */}
        <nav
          aria-label="Alphabetical navigation"
          className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap gap-1 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm"
        >
          {sortedKeys.map((letter) => (
            <a
              key={letter}
              href={`#section-${letter}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {letter}
            </a>
          ))}
        </nav>

        {/* Series Sections */}
        {sortedKeys.map((letter) => {
          const letterSeries = grouped.get(letter)!;
          return (
            <section key={letter} id={`section-${letter}`} className="mb-10">
              <h2 className="mb-4 border-b border-border pb-2 text-lg font-bold text-primary">
                {letter}
                <span className="ml-2 text-sm font-normal text-text-muted">
                  ({letterSeries.length} series)
                </span>
              </h2>

              <div className="space-y-4">
                {letterSeries.map((s) => (
                  <article key={s.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">
                          <Link
                            href={`/series/${s.slug}`}
                            className="text-text-primary hover:text-primary transition-colors"
                          >
                            {s.title}
                          </Link>
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span className="rounded bg-surface-hover px-1.5 py-0.5 capitalize">
                            {s.type.toLowerCase()}
                          </span>
                          <span className="rounded bg-surface-hover px-1.5 py-0.5 capitalize">
                            {s.status.toLowerCase()}
                          </span>
                          <span>{s.chapters.length} ch.</span>
                          {s.genres.slice(0, 3).map((g) => (
                            <Link
                              key={g.slug}
                              href={`/browse/genres/${g.slug}`}
                              className="text-text-muted hover:text-primary transition-colors"
                            >
                              {g.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Chapter links — collapsible for UX but all rendered in DOM for Googlebot */}
                    {s.chapters.length > 0 && (
                      <ArchiveChapterList
                        seriesSlug={s.slug}
                        chapters={s.chapters.map((c) => ({
                          slug: c.slug,
                          number: c.number,
                          title: c.title,
                        }))}
                      />
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {/* Bottom: link back for crawlability */}
        <nav aria-label="Site navigation" className="mt-12 border-t border-border pt-6 text-sm text-text-muted">
          <Link href="/" className="text-primary hover:underline">← Back to Home</Link>
          {' · '}
          <Link href="/browse/trending" className="hover:text-primary transition-colors">Trending</Link>
          {' · '}
          <Link href="/browse/popular" className="hover:text-primary transition-colors">Popular</Link>
          {' · '}
          <Link href="/browse/latest" className="hover:text-primary transition-colors">Latest</Link>
          {' · '}
          <Link href="/browse/genres" className="hover:text-primary transition-colors">Genres</Link>
          {' · '}
          <Link href="/feed.xml" className="hover:text-primary transition-colors">RSS Feed</Link>
        </nav>
      </div>
    </>
  );
}

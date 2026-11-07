export const revalidate = 3600;
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';

type Params = { slug: string };

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { resolveSocialImages } from '@/lib/seo';
import { getCachedGenreList } from '@/lib/genres';

const getCachedGenreDataInternal = unstable_cache(
  async (slug: string) => {
    return prisma.genre.findUnique({ where: { slug } });
  },
  ['genre-detail-data'],
  { tags: ['genres'], revalidate: 86400 }
);

const getCachedGenreData = cache(async (slug: string) => {
  return getCachedGenreDataInternal(slug);
});

const getCachedGenreSeries = unstable_cache(
  async (slug: string) => {
    return prisma.series.findMany({
      where: { 
        genres: { some: { slug } }
      },
      select: SERIES_CARD_SELECT,
      // Link every series in the genre (46 series exist site-wide today);
      // the old cap of 40 silently dropped series from genre discovery.
      take: 100,
      orderBy: { totalViews: 'desc' }
    });
  },
  ['genre-series-list'],
  { tags: ['series-data'], revalidate: 3600 }
);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getCachedGenreData(slug);
  const settings = await getCachedSettings();
  
  if (!genre) return { title: 'Genre Not Found' };
  
  const _siteTitle = settings.seo_site_title || 'REDBEARD';
  
  // Custom SEO from DB overrides defaults
  const seo = (genre.seo as Record<string, any>) || {};
  
  const defaultTitle = `Read Best ${genre.name} Manhwa & Manga in Hindi | ${_siteTitle}`;
  const defaultDescription = `Read the best ${genre.name} manhwa, manga, and comics in Hindi on ${_siteTitle}. ${genre.description || ''}`.trim();
  
  const title = seo.title || defaultTitle;
  const description = seo.description || defaultDescription;
  const url = `${APP_URL}/browse/genres/${slug}`;

  const { ogImage, twitterImage } = resolveSocialImages({
    customOgImage: seo.ogImage || seo.image,
    customTwitterImage: seo.twitterImage,
    settings,
  });

  return {
    title: { absolute: title },
    description,
    // Explicit robots: the root layout no longer emits a global robots tag
    // (it conflicted with the noindex Next.js injects on 404 pages), so this
    // page declares the same directive it previously inherited.
    robots: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1, 'max-video-preview': -1 },
    keywords: [genre.name, 'download', 'comics', 'manga', 'webtoon', `${genre.name} series`, 'hindi', 'manhwa in hindi'],
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [twitterImage],
    },
    alternates: {
      canonical: url,
    }
  };
}

export default async function GenreDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  
  const genre = await getCachedGenreData(slug);
  if (!genre) notFound();

  const dbSeries = await getCachedGenreSeries(slug);
  const allGenres = await getCachedGenreList();
  const otherGenres = allGenres.filter((g) => g.slug !== slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': `${APP_URL}`
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Genres',
        'item': `${APP_URL}/browse/genres`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': genre.name,
        'item': `${APP_URL}/browse/genres/${slug}`
      }
    ]
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* SEO: Breadcrumb link back to genres index */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/browse/genres" className="hover:text-text-primary transition-colors">
          ← All Genres
        </Link>
      </nav>
      <BrowseGrid
        title={genre.name}
        subtitle={`Explore all ${genre.name.toLowerCase()} series`}
        description={genre.description}
        icon={
          <div className="h-5 w-5 rounded-full" style={{ backgroundColor: genre.color || '#E53935' }} />
        }
        series={dbSeries.map(s => toSeriesCardData(s as any))}
      />
      {/* Internal linking: cross-links so every genre page is discoverable
          from every other genre page (previously only the genres index
          linked to them). */}
      {otherGenres.length > 0 && (
        <nav aria-label="More genres" className="mt-10 border-t border-border pt-6">
          <h2 className="mb-3 text-base font-semibold text-text-primary">Explore more genres</h2>
          <div className="flex flex-wrap gap-1.5">
            {otherGenres.map((g) => (
              <Link
                key={g.slug}
                href={`/browse/genres/${g.slug}`}
                prefetch={false}
                className="rounded-md bg-card/80 border border-border/60 px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}


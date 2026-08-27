export const revalidate = 3600;
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData, SERIES_CARD_SELECT } from '@/lib/data-mappers';
import { unstable_cache } from 'next/cache';

type Params = { slug: string };

import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

const getCachedGenreData = unstable_cache(
  async (slug: string) => {
    return prisma.genre.findUnique({ where: { slug } });
  },
  ['genre-data-by-slug'],
  { tags: ['genres'], revalidate: 3600 }
);

const getCachedGenreSeries = unstable_cache(
  async (slug: string) => {
    return prisma.series.findMany({
      where: { 
        genres: { some: { slug } }
      },
      select: SERIES_CARD_SELECT,
      take: 40,
      orderBy: { totalViews: 'desc' }
    });
  },
  ['genre-series-by-slug'],
  { tags: ['series', 'genres'], revalidate: 3600 }
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

  return { 
    title,
    description,
    keywords: [genre.name, 'download', 'comics', 'manga', 'webtoon', `${genre.name} series`, 'hindi', 'manhwa in hindi'],
    openGraph: {
      title,
      description,
      url,
      type: 'website',
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
    </div>
  );
}


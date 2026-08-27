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
  const title = `Best ${genre.name} Comics & Series - Download | ${settings.siteName || 'REDBEARD'}`;
  const description = `Download the best ${genre.name} series, comics, manga, and webtoons on ${settings.siteName || 'REDBEARD'}. ${genre.description || ''}`;
  const url = `${APP_URL}/browse/genres/${slug}`;

  return { 
    title,
    description,
    keywords: [genre.name, 'download', 'comics', 'manga', 'webtoon', `${genre.name} series`],
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

  return (
    <div>
      {/* SEO: Breadcrumb link back to genres index */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/browse/genres" className="hover:text-text-primary transition-colors">
          ← All Genres
        </Link>
      </nav>
      <BrowseGrid
      title={genre.name}
      subtitle={`Explore all ${genre.name.toLowerCase()} series`}
      icon={
        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: genre.color || '#E53935' }} />
      }
      series={dbSeries.map(s => toSeriesCardData(s as any))}
    />
    </div>
  );
}


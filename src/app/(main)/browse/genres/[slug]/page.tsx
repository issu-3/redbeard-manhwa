export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

type Params = { slug: string };

import { APP_URL } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = await prisma.genre.findUnique({ where: { slug } });
  const settings = await getCachedSettings();
  
  if (!genre) return { title: 'Genre Not Found' };
  
  const siteTitle = settings.seo_site_title || 'REDBEARD';
  const title = `Best ${genre.name} Manhwa | ${settings.siteName || 'REDBEARD'}`;
  const description = `Read the best ${genre.name} manhwa, manga, and webtoons online on ${settings.siteName || 'REDBEARD'}. ${genre.description || ''}`;
  const url = `${APP_URL}/browse/genres/${slug}`;

  return { 
    title,
    description,
    keywords: [genre.name, 'manhwa', 'manga', 'read online', `${genre.name} manhwa`],
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
  
  const genre = await prisma.genre.findUnique({ where: { slug } });
  if (!genre) notFound();

  const dbSeries = await prisma.series.findMany({
    where: { genres: { some: { slug } } },
    include: { genres: true },
    take: 40,
    orderBy: { totalViews: 'desc' }
  });

  return (
    <BrowseGrid
      title={genre.name}
      subtitle={`Explore all ${genre.name.toLowerCase()} series`}
      icon={
        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: genre.color || '#E53935' }} />
      }
      series={dbSeries.map(toSeriesCardData)}
    />
  );
}


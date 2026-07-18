import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrowseGrid } from '@/components/shared/BrowseGrid';
import { prisma } from '@/lib/prisma';
import { toSeriesCardData } from '@/lib/data-mappers';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = await prisma.genre.findUnique({ where: { slug } });
  return { title: genre?.name || 'Genre' };
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

